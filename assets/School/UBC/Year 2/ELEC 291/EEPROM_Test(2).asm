$MODLP51
org 0000H
   ljmp MainProgram

FT93C66_CE   EQU P2.0  ; WARNING: shared with MCP3008!
FT93C66_MOSI EQU P2.1 
FT93C66_MISO EQU P2.2
FT93C66_SCLK EQU P2.3 

$include(FT93C66.inc)

CLK  EQU 22118400
BAUD equ 115200
BRG_VAL equ (0x100-(CLK/(16*BAUD)))

CSEG

; Configure the serial port and baud rate
InitSerialPort:
    ; Since the reset button bounces, we need to wait a bit before
    ; sending messages, otherwise we risk displaying gibberish!
    mov R1, #222
    mov R0, #166
    djnz R0, $   ; 3 cycles->3*45.21123ns*166=22.51519us
    djnz R1, $-4 ; 22.51519us*222=4.998ms
    ; Now we can proceed with the configuration
	orl	PCON,#0x80
	mov	SCON,#0x52
	mov	BDRCON,#0x00
	mov	BRL,#BRG_VAL
	mov	BDRCON,#0x1E ; BDRCON=BRR|TBCK|RBCK|SPD;
    ret

; Send a character using the serial port
putchar:
    jnb TI, putchar
    clr TI
    mov SBUF, a
    ret

; Send a constant-zero-terminated string using the serial port
SendString:
    clr A
    movc A, @A+DPTR
    jz SendStringDone
    lcall putchar
    inc DPTR
    sjmp SendString
SendStringDone:
    ret

test:
    DB  'FT93C66A EEPROM test', '\r', '\n', 0
pass:
    DB  'Pass.', '\r', '\n', 0
fail:
    DB  'Fail', '\r', '\n', 0

MainProgram:
    mov SP, #7FH ; Set the stack pointer to the begining of idata
    clr FT93C66_CE
    lcall FT93C66_INIT_SPI
    
    lcall InitSerialPort
    mov dptr, #test
    lcall SendString
    
    lcall FT93C66_Write_Enable
    
    mov dptr, #0x10 ; Random memory location to test
    mov a, #0x55 ; Value to write at location
    lcall FT93C66_Write
    lcall FT93C66_Read
    cjne a, #0x55, it_failed ; Read back and check if the location was written correctly

    ; Test another address
    mov dptr, #0x33 ; Random memory location to test
    mov a, #0xaa ; Value to write at location
    lcall FT93C66_Write
    lcall FT93C66_Read
    cjne a, #0xaa, it_failed ; Read back and check if the location was written correctly
        
    mov dptr, #pass
    lcall SendString
    ljmp done    

it_failed:
    mov dptr, #fail
    lcall SendString

done:    
    sjmp $ ; This is equivalent to 'forever: sjmp forever'
    
END
