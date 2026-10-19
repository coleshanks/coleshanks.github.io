#!/usr/bin/env python3
"""Build assets/data/search-index.json for the / menu (scripts/menu.js).

Run by hand after adding or removing a page or changing page text, then commit
the JSON with the change:  python3 scripts/build-search-index.py

Starts at index.html and follows the site's own links, so unlinked pages
(games.html, the 404) stay out without a list. A page with
<meta name="robots" content="noindex"> stays out too (Cedar Lake's bare game
page, reached through its project page). Writes:
  tree     the pages as the menu's nested Go to lists, each page under the one
           that first links to it (breadth-first from the home page)
  entries  what typing searches: every page, plus every hub row (.card,
           .country-row, .course-row) pointing where the row links, plus every
           code block's file (details.code-block[data-src]), read from disk,
           with its src in 's' so the menu can open that block
Standard library only.
"""
import hashlib
import html.parser
import json
import os
import posixpath
import re
import sys
import unicodedata
from urllib.parse import unquote, urljoin, urlparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'data', 'search-index.json')
START = '/index.html'
SKIP = {'/under_construction.html', '/404.html'}  # error pages, never results
ROW_CLASSES = {'card', 'country-row', 'course-row'}
HEADINGS = {'h1', 'h2', 'h3', 'h4'}
IGNORED = {'script', 'style', 'noscript', 'template', 'head'}
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link',
        'meta', 'source', 'track', 'wbr'}


def emoji_names(text):
    """'🥟 dumplings' -> 'dumpling': emoji count as words, so 'dumplings' finds 🥟."""
    names = []
    for ch in text:
        if unicodedata.category(ch) == 'So':
            name = unicodedata.name(ch, '')
            if name:
                names.append(name.lower())
    return ' '.join(dict.fromkeys(names))


def clean(text):
    return re.sub(r'\s+', ' ', unicodedata.normalize('NFC', text)).strip()


class Page(html.parser.HTMLParser):
    """Collects one page's title, headings, text, links and hub rows."""

    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.path = path
        self.title = ''
        self.links = []          # (href, link text) in document order
        self.rows = []           # dicts: heading, text, links
        self.headings = []
        self.text = []           # body text outside the hub rows
        self.stack = []          # open tags: (tag, flags)
        self.in_title = False
        self.link = None         # [href, text] while inside an <a>
        self.row = None          # the hub row being read
        self.heading = None      # text of the heading being read
        self.alts = set()
        self.code_blocks = []    # dicts: src, name (the summary)
        self.code = None         # the code block being read
        self.in_summary = False
        self.noindex = False     # <meta name="robots" content="noindex">: not listed

    def skipping(self):
        return any(f.get('skip') for _, f in self.stack)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        classes = set((a.get('class') or '').split())
        flags = {}
        if tag == 'meta' and (a.get('name') or '').lower() == 'robots' and 'noindex' in (a.get('content') or '').lower():
            self.noindex = True
        # the navbar repeats on every page; code blocks say "Loading..." until fetched
        if tag in IGNORED or tag == 'title' or classes & {'navbar', 'profile_navbar', 'code-loading'}:
            flags['skip'] = True
        if tag == 'title':
            self.in_title = True
        if not self.skipping() and not flags.get('skip'):
            if classes & ROW_CLASSES and self.row is None:
                self.row = {'heading': '', 'text': [], 'links': []}
                flags['row'] = True
            if tag in HEADINGS:
                self.heading = []
                flags['heading'] = True
            if tag == 'a' and a.get('href'):
                self.link = [a['href'], []]
                flags['link'] = True
            if tag == 'details' and 'code-block' in classes and a.get('data-src') and self.code is None:
                self.code = {'src': a['data-src'], 'name': ''}
                self.code_blocks.append(self.code)
                flags['code'] = True
            if tag == 'summary' and self.code is not None:
                self.in_summary = True
                flags['summary'] = True
            if tag == 'img' and a.get('alt') and a['alt'] not in self.alts:
                self.alts.add(a['alt'])  # once each: a gallery's photos all share one alt
                self.add_text(a['alt'])
        # navbar links still count as links, so every page is reachable
        if tag == 'a' and a.get('href') and self.skipping():
            self.links.append((a['href'], ''))
        if tag not in VOID:
            self.stack.append((tag, flags))

    def handle_endtag(self, tag):
        if tag == 'title':
            self.in_title = False
        # pop to the matching tag; tolerates unclosed <p>, <li> and so on
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                for _, flags in reversed(self.stack[i:]):
                    self.close(flags)
                del self.stack[i:]
                return

    def close(self, flags):
        if flags.get('link') and self.link:
            href, words = self.link
            text = clean(' '.join(words))
            self.links.append((href, text))
            if self.row is not None:
                self.row['links'].append((href, text))
            self.link = None
        if flags.get('heading') and self.heading is not None:
            text = clean(' '.join(self.heading))
            if text:
                if self.row is not None and not self.row['heading']:
                    self.row['heading'] = text
                else:
                    self.headings.append(text)
            self.heading = None
        if flags.get('summary'):
            self.in_summary = False
        if flags.get('code'):
            self.code = None
        if flags.get('row') and self.row is not None:
            self.rows.append(self.row)
            self.row = None

    def handle_data(self, data):
        if self.in_title:
            self.title += data
            return
        if self.skipping():
            return
        if self.link is not None:
            self.link[1].append(data)
        if self.heading is not None:
            self.heading.append(data)
        if self.in_summary:
            self.code['name'] += data
        self.add_text(data)

    def add_text(self, data):
        (self.row['text'] if self.row is not None else self.text).append(data)


def resolve(base, href):
    """A link on page base -> a site page path like /cv.html, or None."""
    url = urlparse(urljoin('http://site' + base, href))
    if url.netloc != 'site':
        return None
    path = unquote(url.path)
    if path.endswith('/'):
        path += 'index.html'
    path = posixpath.normpath(path)
    if not path.endswith('.html') or path in SKIP:
        return None
    return path


def real_case(path):
    """The path as it's spelled on disk, or None if missing. GitHub Pages is
    case sensitive and macOS isn't, so a wrong-case link works only locally."""
    cur = ROOT
    for part in path.strip('/').split('/'):
        try:
            names = os.listdir(cur)
        except OSError:
            return None
        match = next((n for n in names if unicodedata.normalize('NFC', n) == unicodedata.normalize('NFC', part)), None)
        if match is None:
            return None
        cur = os.path.join(cur, match)
    return cur


def label_of(page):
    return clean(page.title.split('|')[0]) or posixpath.basename(page.path)


def main():
    pages, parent, label, order, warnings = {}, {}, {}, [START], []
    i = 0
    while i < len(order):  # breadth-first from the home page
        path = order[i]
        i += 1
        file = real_case(path)
        if file is None:
            warnings.append(f'missing: {path}')
            continue
        page = Page(path)
        with open(file, encoding='utf-8') as f:
            page.feed(f.read())
        if page.noindex:
            parent.pop(path, None)
            label.pop(path, None)
            continue
        pages[path] = page
        for href, text in page.links:
            target = resolve(path, href)
            if not target:
                continue
            if target not in parent and target != START:
                file = real_case(target)
                if file is None:
                    warnings.append(f'broken link on {path}: {href}')
                    continue
                if not file.endswith(target.lstrip('/').replace('/', os.sep)):
                    warnings.append(f'case mismatch on {path}: {href} (works on a Mac, 404s live)')
                parent[target] = path
                order.append(target)
            if target != START and parent.get(target) == path and text and target not in label:
                label[target] = text  # the parent's link text

    # A page belongs under the hub whose card or row links to it (School → UBC),
    # even when another page links to it first (the CV links to UBC too)
    def above(a, b):  # is a above b in the tree (or b itself)?
        while b is not None:
            if b == a:
                return True
            b = parent.get(b)
        return False

    hubbed = set()
    for path in order:
        page = pages.get(path)
        for row in page.rows if page else []:
            target = next((t for t in (resolve(path, h) for h, _ in row['links']) if t in pages), None)
            if not target or target == START or target in hubbed or above(target, path):
                continue
            parent[target] = path
            label[target] = row['heading'] or next((t for _, t in row['links'] if t), '') or label.get(target, '')
            hubbed.add(target)
    label[START] = 'Home'

    def name(path):
        return label.get(path) or label_of(pages[path])

    def crumb(path):
        names = []
        while path in parent:
            path = parent[path]
            if path != START:
                names.append(name(path))
        return ' › '.join(reversed(names))

    def subtree(path):  # children in the order the page links to them
        links = [resolve(path, h) for h, _ in pages[path].links]
        kids = sorted((p for p in pages if parent.get(p) == path),
                      key=lambda p: links.index(p) if p in links else len(links))
        node = {'t': name(path), 'u': path}
        if kids:
            node['k'] = [subtree(k) for k in kids]
        return node

    home = subtree(START)
    tree = [{'t': home['t'], 'u': home['u']}] + home.get('k', [])

    entries, by_page = [], {}
    for path in order:
        page = pages.get(path)
        if not page:
            continue
        entry = {
            't': name(path), 'c': crumb(path), 'u': path,
            'h': ' · '.join(dict.fromkeys(page.headings)),
            'x': clean(' '.join(page.text)),
        }
        entries.append(entry)
        by_page[path] = entry
    # A hub row's text (a Travel blurb, a course's full name) belongs to the page
    # it links to, ahead of that page's own text so it's what the snippet shows.
    # A row with no page of its own (a course without a page) stays an entry
    # pointing at the hub.
    for path in order:
        for row in pages[path].rows if path in pages else []:
            rtext = clean(' '.join(row['text']))
            if row['heading'] and rtext.startswith(row['heading']):
                rtext = rtext[len(row['heading']):].strip()  # the title shows already
            target = next((t for t in (resolve(path, h) for h, _ in row['links']) if t in by_page), None)
            if target and target != path:
                entry = by_page[target]
                if rtext and rtext not in entry['x']:
                    entry['x'] = clean(rtext + ' · ' + entry['x'])
                continue
            title = row['heading'] or next((t for _, t in row['links'] if t), '')
            if title:
                entries.append({'t': title, 'c': ' › '.join(filter(None, [crumb(path), name(path)])),
                                'u': path, 'h': '', 'x': rtext})
    # A code block's file is fetched only when it's opened, so the page text has
    # just its name; the file itself is an entry of its own
    for path in order:
        for block in pages[path].code_blocks if path in pages else []:
            src = unquote(block['src'])
            file = real_case(src)
            if file is None:
                warnings.append(f'missing code on {path}: {block["src"]}')
                continue
            with open(file, encoding='utf-8', errors='replace') as f:
                code = f.read()
            entries.append({'t': clean(block['name']) or posixpath.basename(src),
                            'c': ' › '.join(filter(None, [crumb(path), name(path)])),
                            'u': path, 'h': '', 'x': clean(code), 's': block['src']})
    for entry in entries:
        entry['k'] = emoji_names(entry['x'])

    index = {'tree': tree, 'entries': entries}

    # what changed since the last build, by page
    def digest(es):
        out = {}
        for e in es:
            out.setdefault(e['u'], hashlib.sha1())
            out[e['u']].update(json.dumps(e, ensure_ascii=False, sort_keys=True).encode())
        return {u: h.hexdigest() for u, h in out.items()}
    try:
        with open(OUT, encoding='utf-8') as f:
            old = json.load(f)
    except (OSError, ValueError):
        old = None

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False, separators=(',', ':'))
        f.write('\n')

    size = os.path.getsize(OUT)
    print(f'wrote {os.path.relpath(OUT, ROOT)}: {len(pages)} pages, {len(entries)} entries, {size / 1024:.0f} KB')
    if old is not None:
        before, after = digest(old.get('entries', [])), digest(entries)
        for u in sorted(after.keys() - before.keys()):
            print(f'  added   {u}')
        for u in sorted(before.keys() - after.keys()):
            print(f'  removed {u}')
        for u in sorted(u for u in after.keys() & before.keys() if after[u] != before[u]):
            print(f'  changed {u}')
        if old.get('tree') != tree:
            print('  the page tree changed')
    for w in warnings:
        print(f'warning: {w}', file=sys.stderr)


if __name__ == '__main__':
    main()
