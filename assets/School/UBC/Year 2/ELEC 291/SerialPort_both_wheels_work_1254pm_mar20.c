#include <XC.h>
#include <sys/attribs.h>
#include <stdio.h>

#pragma config FNOSC = FRCPLL       // Internal Fast RC oscillator (8 MHz) w/ PLL
#pragma config FPLLIDIV = DIV_2     // Divide FRC before PLL (now 4 MHz)
#pragma config FPLLMUL = MUL_20     // PLL Multiply (now 80 MHz)
#pragma config FPLLODIV = DIV_2     // Divide After PLL (now 40 MHz) see figure 8.1 in datasheet for more info
#pragma config FWDTEN = OFF         // Watchdog Timer Disabled
#pragma config FPBDIV = DIV_1       // PBCLK = SYCLK

#define SYSCLK 40000000L // cpu speed = 40 MHz
#define FREQ 100000L // We need the ISR for timer 1 every 10 us
#define Baud2BRG(desired_baud)( (SYSCLK / (16*desired_baud))-1)

volatile int ISR_pw=100, ISR_cnt=0, ISR_frc;
volatile int rightwheelfwd = 0;
volatile int rightwheelbck = 0;
volatile int leftwheelfwd=0;
volatile int leftwheelbck=0;

// The Interrupt Service Routine for timer 1 is used to generate one or more standard
// hobby servo signals.  The servo signal has a fixed period of 20ms and a pulse width
// between 0.6ms and 2.4ms.
void __ISR(_TIMER_2_VECTOR,IPL6SOFT) Timer2_Handler(void)
{
	IFS0bits.T2IF=0; // clear interrupt flag T2= second timer
	//printf("timer2 interrupt works!");
}

void __ISR(_TIMER_1_VECTOR,IPL5SOFT) Timer1_Handler(void)
{
	IFS0CLR=_IFS0_T1IF_MASK; // Clear timer 1 interrupt flag, bit 4 of IFS0
	// motor is on ISR_pw/2000 of the time
	ISR_cnt++;
	if(ISR_cnt<rightwheelfwd)
	{
		LATBbits.LATB6 = 1;
	}
	else
	{
		LATBbits.LATB6 = 0;
	}
	if(ISR_cnt>=100)
	{
		ISR_cnt=0; // 2000 * 10us=20ms
		ISR_frc++;
	}
	
	if(ISR_cnt<rightwheelbck)
	{
		LATBbits.LATB5 = 1;
	}
	else
	{
		LATBbits.LATB5 = 0;
	}
	if(ISR_cnt>=100)
	{
		ISR_cnt=0; // 2000 * 10us=20ms
		ISR_frc++;
	}
	
	
	if(ISR_cnt<leftwheelfwd)
	{
		LATBbits.LATB2 = 1;
	}
	else
	{
		LATBbits.LATB2 = 0;
	}
	if(ISR_cnt>=100)
	{
		ISR_cnt=0; // 2000 * 10us=20ms
		ISR_frc++;
	}
	
	if(ISR_cnt<leftwheelbck)
	{
		LATBbits.LATB3 = 1;
	}
	else
	{
		LATBbits.LATB3 = 0;
	}
	if(ISR_cnt>=100)
	{
		ISR_cnt=0; // 2000 * 10us=20ms
		ISR_frc++;
	}
	
	
	
	
	
	
	
	
	
}

void SetupTimer1 (void)
{
	// Explanation here: https://www.youtube.com/watch?v=bu6TTZHnMPY
	__builtin_disable_interrupts();
	//set up interrupt timer 1
	PR1 =(SYSCLK/FREQ)-1; // since SYSCLK/FREQ = PS*(PR1+1)
	TMR1 = 0;
	T1CONbits.TCKPS = 0; // 3=1:256 prescale value, 2=1:64 prescale value, 1=1:8 prescale value, 0=1:1 prescale value
	T1CONbits.TCS = 0; // Clock source
	T1CONbits.ON = 1;
	IPC1bits.T1IP = 5; // P = priority
	IPC1bits.T1IS = 0; // S = subpriority
	IFS0bits.T1IF = 0; // F = flag ( flag sets this interrupt on=1,0=off)
	IEC0bits.T1IE = 1; // E = enable this interrupt in system ( not the same as flag)
	INTCONbits.MVEC = 1; //Int multi-vector
	//set up interrupt core timer 
	
	__builtin_enable_interrupts();
}

void SetupTimer2 (void)
{
	__builtin_disable_interrupts();
	PR2 = 60000;
	TMR2 = 0;
	T2CONbits.TCKPS = 3; // 3=1:256 prescale value, 2=1:64 prescale value, 1=1:8 prescale value, 0=1:1 prescale value
	T2CONbits.TCS = 0; // Clock source
	T2CONbits.ON = 1;
	IPC2bits.T2IP = 6; // P = priority
	IPC2bits.T2IS = 0; // S = subpriority
	IFS0bits.T2IF = 0; // F = flag ( flag sets this interrupt on=1,0=off)
	IEC0bits.T2IE = 1; // E = enable this interrupt in system ( not the same as flag)
	INTCONbits.MVEC = 1; //Int multi-vector
	__builtin_enable_interrupts();
}


void UART2Configure(int baud_rate)
{
    // Peripheral Pin Select
    U2RXRbits.U2RXR = 4;    //SET RX to RB8
    RPB9Rbits.RPB9R = 2;    //SET RB9 to TX

    U2MODE = 0;         // disable autobaud, TX and RX enabled only, 8N1, idle=HIGH
    U2STA = 0x1400;     // enable TX and RX
    U2BRG = Baud2BRG(baud_rate); // U2BRG = (FPb / (16*baud)) - 1
    
    U2MODESET = 0x8000;     // enable UART2
}

void delay_ms (int msecs)
{	
	int ticks;
	ISR_frc=0;
	ticks=msecs/20;
	while(ISR_frc<ticks);
}

/* SerialReceive() is a blocking function that waits for data on
 *  the UART2 RX buffer and then stores all incoming data into *buffer
 *
 * Note that when a carriage return '\r' is received, a nul character
 *  is appended signifying the strings end
 *
 * Inputs:  *buffer = Character array/pointer to store received data into
 *          max_size = number of bytes allocated to this pointer
 * Outputs: Number of characters received */
unsigned int SerialReceive(char *buffer, unsigned int max_size)
{
    unsigned int num_char = 0;
 
    /* Wait for and store incoming data until either a carriage return is received
     *   or the number of received characters (num_chars) exceeds max_size */
    while(num_char < max_size)
    {
        while( !U2STAbits.URXDA);   // wait until data available in RX buffer
        *buffer = U2RXREG;          // empty contents of RX buffer into *buffer pointer

        while( U2STAbits.UTXBF);    // wait while TX buffer full
        U2TXREG = *buffer;          // echo
 
        // insert nul character to indicate end of string
        if( *buffer == '\r')
        {
            *buffer = '\0';     
            break;
        }
 
        buffer++;
        num_char++;
    }
 
    return num_char;
}

void main (void)
{
    char buf[32];
    int pw1;
    int pw2;
    int pw3;
    int pw4;
    
	DDPCON = 0;
	
	// Configure the pin we are using for servo control as output
	
	//pin RB6
	TRISBbits.TRISB6 = 0;
	LATBbits.LATB6 = 1;	// 0= send signal, 1 = do not send signal
	INTCONbits.MVEC = 1;
	
	// pin RB7
	TRISBbits.TRISB5 = 0;
	LATBbits.LATB5 = 1;
	INTCONbits.MVEC = 1;
	
	//pin RB6
	TRISBbits.TRISB2 = 0;
	LATBbits.LATB2 = 1;	// 0= send signal, 1 = do not send signal
	INTCONbits.MVEC = 1;
	
	// pin RB7
	TRISBbits.TRISB3 = 0;
	LATBbits.LATB3 = 1;
	INTCONbits.MVEC = 1;
	
	
	SetupTimer1(); // Set timer 5 to interrupt every 10 us
//	SetupTimer2();
	CFGCON = 0;
    UART2Configure(115200);  // Configure UART2 for a baud rate of 115200
	
	// Give putty a chance to start
	delay_ms(500); // wait 500 ms
	
	printf("\x1b[2J\x1b[1;1H"); // Clear screen using ANSI escape sequence.
    printf("Servo signal generator for the PIC32MX130F064B.\r\n");
    printf("By Jesus Calvino-Fraga (c) 2018.\r\n");
    printf("Pulse width between 0 and 100)\r\n");
	
	while (1)
	{
    	printf("New pulse rightwheelfwd: ");
    	fflush(stdout);
    	SerialReceive(buf, sizeof(buf)-1); // wait here until+ data is received
    	delay_ms(2);
    	printf("\n");
    	fflush(stdout);
	    pw1=atoi(buf);
	    
	    printf("New pulse rightwheelbck: ");
    	fflush(stdout);
    	SerialReceive(buf, sizeof(buf)-1); // wait here until data is received
    	delay_ms(2);
    	printf("\n");
    	fflush(stdout);
	    pw2=atoi(buf);
	    delay_ms(2);
	    
	    printf("New pulse leftwheelfwd: ");
    	fflush(stdout);
    	SerialReceive(buf, sizeof(buf)-1); // wait here until+ data is received
    	delay_ms(2);
    	printf("\n");
    	fflush(stdout);
	    pw3=atoi(buf);
	    
	    printf("New pulse leftwheelbck: ");
    	fflush(stdout);
    	SerialReceive(buf, sizeof(buf)-1); // wait here until+ data is received
    	delay_ms(2);
    	printf("\n\n\n\n\n");
    	fflush(stdout);
	    pw4=atoi(buf);
	    
	    delay_ms(200);
	    rightwheelfwd=pw1;
	    rightwheelbck=pw2;
	    leftwheelfwd=pw3;
	    leftwheelbck=pw4;
	}
}

