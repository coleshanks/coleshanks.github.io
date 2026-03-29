#include <XC.h>
#include <sys/attribs.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#pragma config FNOSC = FRCPLL       // Internal Fast RC oscillator (8 MHz) w/ PLL
#pragma config FPLLIDIV = DIV_2     // Divide FRC before PLL (now 4 MHz)
#pragma config FPLLMUL = MUL_20     // PLL Multiply (now 80 MHz)
#pragma config FPLLODIV = DIV_2     // Divide After PLL (now 40 MHz) see figure 8.1 in datasheet for more info
#pragma config FWDTEN = OFF         // Watchdog Timer Disabled
#pragma config FPBDIV = DIV_1       // PBCLK = SYCLK
#pragma config FSOSCEN = OFF 

#define SYSCLK 40000000L // cpu speed = 40 MHz
#define FREQ 100000L // We need the ISR for timer 1 every 10 us
#define Baud2BRG(desired_baud)( (SYSCLK / (16*desired_baud))-1)
#define COINFREQUENCY 59250 //coin detection frequency in Hz

volatile int ISR_pw=60, ISR_cnt=0, ISR_frc;
volatile int ISR_cntwheels=0;
volatile int ISR_pw2 = 210;
volatile int rightwheelfwd = 0;
volatile int rightwheelbck = 0;
volatile int leftwheelfwd=0;
volatile int leftwheelbck=0;
volatile int carry=0;
volatile int check =0;
volatile float voltage=0;
volatile int count=0;
volatile int backupbeep=0;
/*
volatile int x1=0;
volatile int x2=0;
volatile int x3=0;
*/

// The Interrupt Service Routine for timer 1 is used to generate one or more standard
// hobby servo signals.  The servo signal has a fixed period of 20ms and a pulse width
// between 0.6ms and 2.4ms.
void __ISR(_TIMER_2_VECTOR,IPL6SOFT) Timer2_Handler(void)
{
	IFS0bits.T2IF=0; // clear interrupt flag T2= second timer
}

void __ISR(_TIMER_1_VECTOR,IPL5SOFT) Timer1_Handler(void)
{
	/*
	//IFS0CLR=_IFS0_T1IF_MASK; // Clear timer 1 interrupt flag, bit 4 of IFS0
	// motor is on ISR_pw/2000 of the time
	*/
	ISR_cnt++;
	ISR_cntwheels++;

		if(ISR_cnt<ISR_pw)
	{
		LATBbits.LATB13 = 1;
	}
	else
	{
		LATBbits.LATB13 = 0;
	}
	
	if(ISR_cnt>=2000)
	{
		ISR_cnt=0; // 2000 * 10us=20ms
		ISR_frc++;
	}
	
	if(ISR_cnt<ISR_pw2)
	{
		LATBbits.LATB10 = 1;
	}
	else
	{
		LATBbits.LATB10 = 0;
	}
	
	if(ISR_cnt>=2000)
	{
		ISR_cnt=0; // 2000 * 10us=20ms
		ISR_frc++;
	}
	
	
	
	
	
	
	
	
	if(ISR_cntwheels<rightwheelfwd)
	{
		LATBbits.LATB6 = 1;
	}
	else
	{
		LATBbits.LATB6 = 0;
	}
	if(ISR_cntwheels>=100)
	{
		ISR_cntwheels=0; // 2000 * 10us=20ms
		ISR_frc++;
	}
	
	if(ISR_cntwheels<rightwheelbck)
	{
		LATBbits.LATB5 = 1;
	}
	else
	{
		LATBbits.LATB5 = 0;
	}
	if(ISR_cntwheels>=100)
	{
		ISR_cntwheels=0; // 2000 * 10us=20ms
		ISR_frc++;
	}
	if(ISR_cntwheels<leftwheelfwd)
	{
		LATBbits.LATB2 = 1;
	}
	else
	{
		LATBbits.LATB2 = 0;
	}

	if(ISR_cntwheels<leftwheelbck)
	{
		LATBbits.LATB3 = 1;
	}
	else
	{
		LATBbits.LATB3 = 0;
	}
	if(ISR_cntwheels>=100)
	{
		ISR_cntwheels=0; // 2000 * 10us=20ms
		ISR_frc++;
	}
	
	
	
	
	// backing up sound
	if(backupbeep)
	{
	count++;
	if( count < 81)
	{
		LATBbits.LATB4=1;
	}
	else if ( count < 162)
	{
		LATBbits.LATB4 = 0;
	}
	else
		count=0;
	}
	
	IFS0CLR=_IFS0_T1IF_MASK;
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

int SerialTransmit(const char *buffer)
{
    unsigned int size = strlen(buffer);
    while( size)
    {
        while( U2STAbits.UTXBF);    // wait while TX buffer full
        U2TXREG = *buffer;          // send single character to transmit buffer
        buffer++;                   // transmit next character on following loop
        size--;                     // loop until all characters sent (when size = 0)
    }
 
    while( !U2STAbits.TRMT);        // wait for last transmission to finish
 
    return 0;
}

void ADCConf(void)
{
    AD1CON1CLR = 0x8000;    // disable ADC before configuration
    AD1CON1 = 0x00E0;       // internal counter ends sampling and starts conversion (auto-convert), manual sample
    AD1CON2 = 0;            // AD1CON2<15:13> set voltage reference to pins AVSS/AVDD
    AD1CON3 = 0x0f01;       // TAD = 4*TPB, acquisition time = 15*TAD 
    AD1CON1SET=0x8000;      // Enable ADC
}

int ADCRead(char analogPIN)
{
    AD1CHS = analogPIN << 16;    // AD1CHS<16:19> controls which analog pin goes to the ADC
 
    AD1CON1bits.SAMP = 1;        // Begin sampling
    while(AD1CON1bits.SAMP);     // wait until acquisition is done
    while(!AD1CON1bits.DONE);    // wait until conversion done
 
    return ADC1BUF0;             // result stored in ADC1BUF0
}


// Needed to by scanf() and gets()
int _mon_getc(int canblock)
{
	char c;
	
    if (canblock)
    {
	    while( !U2STAbits.URXDA); // wait (block) until data available in RX buffer
	    c=U2RXREG;
	    if(c=='\r') c='\n'; // When using PUTTY, pressing <Enter> sends '\r'.  Ctrl-J sends '\n'
		return (int)c;
    }
    else
    {
        if (U2STAbits.URXDA) // if data available in RX buffer
        {
		    c=U2RXREG;
		    if(c=='\r') c='\n';
			return (int)c;
        }
        else
        {
            return -1; // no characters to return
        }
    }
}

// Use the core timer to wait for 1 ms.
void wait_1ms(void)
{
    unsigned int ui;
    _CP0_SET_COUNT(0); // resets the core timer count

    // get the core timer count
    while ( _CP0_GET_COUNT() < (SYSCLK/(2*1000)) );
}

void waitms(int len)
{
	while(len--) wait_1ms();
}

#define PIN_PERIOD (PORTB&(1<<0))


// GetPeriod() seems to work fine for frequencies between 200Hz and 700kHz.
long int GetPeriod (int n)
{
	int i;
	unsigned int saved_TCNT1a, saved_TCNT1b;
	
    _CP0_SET_COUNT(0); // resets the core timer count
	while (PIN_PERIOD!=0) // Wait for square wave to be 0
	{
		if(_CP0_GET_COUNT() > (SYSCLK/4)) return 0;
	}

    _CP0_SET_COUNT(0); // resets the core timer count
	while (PIN_PERIOD==0) // Wait for square wave to be 1
	{
		if(_CP0_GET_COUNT() > (SYSCLK/4)) return 0;
	}
	
    _CP0_SET_COUNT(0); // resets the core timer count
	for(i=0; i<n; i++) // Measure the time of 'n' periods
	{
		while (PIN_PERIOD!=0) // Wait for square wave to be 0
		{
			if(_CP0_GET_COUNT() > (SYSCLK/4)) return 0;
		}
		while (PIN_PERIOD==0) // Wait for square wave to be 1
		{
			if(_CP0_GET_COUNT() > (SYSCLK/4)) return 0;
		}
	}

	return  _CP0_GET_COUNT();
}







void wait(void) //waits approximately half a second
{
	float i=0;
	while(i<150000){
		i++;
	}
	return ;
}

//This function picks up the coin. Ensure ISR_pw, ISR_pw2 are global variables type volatile int that will control arm and base
void pickupcoin (void){
	
	ISR_pw=60; //stand by
	wait();
	ISR_pw2=210;
	wait();
	
	ISR_pw=220; //pick action
	wait();
	ISR_pw2=210;
	wait();
	//turn magnet on
	LATAbits.LATA3 = 1; 
	ISR_pw=220; //sweep action (1)
	wait();	
	
	//continuous sweeping:
	while(ISR_pw2>=120)
	{
	ISR_pw2=ISR_pw2-1; 
	waitms(7);
	}
	//end of continuous sweeping (1)
	//conintuous sweep back!
	while(ISR_pw2<=210)
	{
		ISR_pw2=ISR_pw2+1; 
		waitms(5);
	}
	//end of continuous sweep back!
	
	ISR_pw=220; //sweep action done
	wait();
	ISR_pw2=210;
	wait();
	//
	while(ISR_pw>=90)
	{
		ISR_pw=ISR_pw-1; 
		waitms(4);
	}	
	ISR_pw=90; //transfer action
	wait();
	
	while(ISR_pw2>=110)
	{
		ISR_pw2=ISR_pw2-1; 
		waitms(4);
	}	
	
	
	ISR_pw2=110;
	wait();
	
	ISR_pw=120; // drop action
	wait();
	ISR_pw2=110;
	wait();
	// turn magnet off
	LATAbits.LATA3 = 0; 
	//reset arm position
	wait();
	wait();
	ISR_pw=60;
	ISR_pw2 = 210;
	wait(); //half second ?
}




void reversefullspeed(void){
	rightwheelfwd=0;
	leftwheelfwd=0;
	rightwheelbck=100;
	leftwheelbck=100;
}

void stop(void)// halts wheels of robot
{
	rightwheelfwd=0;
	leftwheelfwd=0;
	rightwheelbck=0;
	leftwheelbck=0;
}
void turnaround(void)
{
	rightwheelfwd=100;
	leftwheelfwd=0;
	rightwheelbck=0;
	leftwheelbck=100;
}


void forwardfullspeed(void)
{
	rightwheelfwd=100;
	leftwheelfwd=100;
	rightwheelbck=0;
	leftwheelbck=0;
}

void backup(void)
{
	// back up !
	reversefullspeed();
	backupbeepfcn();
	/* risky change: backing up perimeter time changed!
	carry=0;
	while(carry<1500000)
	carry++;
	*/
	
	
	//turn around!
	turnaround(); 
	carry=0;	
	while(carry<1250000)//5000000
	carry++;	
	voltage=0;
}

void ledon(void)
{
	LATBbits.LATB1=1; 
}
void ledoff(void)
{
	LATBbits.LATB1=0;
}
void ledredon(void)
{
	LATAbits.LATA2=1;
}

void ledredoff(void)
{
	LATAbits.LATA2=0;
}
void backupbeepfcn(void)
{
	backupbeep=1;
	waitms(350);
	backupbeep=0;
	waitms(350);
	backupbeep=1;
	waitms(350);
	backupbeep=0;
}
void dance(void)
{
short int i=0;
turnaround();
ISR_pw2=210;
ISR_pw=220; //pick action
for(i=0;i<5;i++)
{

	while(ISR_pw<=220)
	{
	ISR_pw=ISR_pw+1; 
	waitms(3);
	}

	while(ISR_pw>=60)
	{
	ISR_pw=ISR_pw-1; 
	waitms(3);
	}


}
	stop();
}

void wakeup(){
int wakeupflag=0;
float voltage=0;

while(wakeupflag!=3){

	
    voltage=(ADCRead(0))*3.3/1023.0; //voltage at right sensor 
	if(voltage>=2.4){
		waitms(1000);
		wakeupflag++;
		}
		}
		wakeupflag=0;
		}
	

void main (void)
{
	int light_count=0;
    char buf[32];
    int pw;
    int pw1;
    int pw2;
    int pw3;
    int pw4;
	int i=0;
    unsigned int rx_size;
	volatile unsigned long t=0;
    int adcval;
    int x;
    int n;    
	long int count;
	float T, f;
	float LEDcount1=0;
	int coinnumber=0;
	
	//adc variables
	
    float voltageleft;
    float voltageright;
    float voltagefront;
    
   
	
	DDPCON = 0;
	
	// Configure the pin we are using for servo control as output
	// wheels pin configuration
	//pin RB6
	// B6,B5,B2,B3 are for the wheel control
	TRISBbits.TRISB6 = 0;
	LATBbits.LATB6 = 0;	// 0= send signal, 1 = do not send signal
	INTCONbits.MVEC = 1;
	
	// pin RB5
	TRISBbits.TRISB5 = 0;
	LATBbits.LATB5 = 0;
	INTCONbits.MVEC = 1;
	
	//pin RB2
	TRISBbits.TRISB2 = 0;
	LATBbits.LATB2 = 0;	// 0= send signal, 1 = do not send signal
	INTCONbits.MVEC = 1;
	
	// pin RB3
	TRISBbits.TRISB3 = 0;
	LATBbits.LATB3 = 0;
	INTCONbits.MVEC = 1;
	
	//green led control
	TRISBbits.TRISB1 =0 ;
	LATBbits.LATB1=0;
	INTCONbits.MVEC = 1;
	
	TRISAbits.TRISA2 =0 ;
	LATAbits.LATA2=0;
	INTCONbits.MVEC = 1;
	
	// read voltage for perimeter detector
	ANSELBbits.ANSB15 = 1;   // set RB3 (AN5, pin 7 of DIP28) as analog pin
    TRISBbits.TRISB15 = 1;   // set RB3 as an input
	
	
	// arm pin setup
	
	TRISBbits.TRISB10 = 0; //B10 controls arm base 
	LATBbits.LATB10 = 0;	
	//
	INTCONbits.MVEC = 1;
	
	//Configure the other servo control pin (RB13)
	TRISBbits.TRISB13 = 0; // B13 controls arm
	LATBbits.LATB13 = 0;	
	INTCONbits.MVEC = 1;
	
	TRISBbits.TRISB4=0; //speakers
	LATBbits.LATB4=0;
	 
	TRISAbits.TRISA3 = 0; // controls magnet
	LATAbits.LATA3 = 0; 	
	//
	INTCONbits.MVEC = 1;
	
	/********************************************************/
	//Code for analog readings of light sensors
	// pins for light sensors
 
 	//front sensor
 	ANSELAbits.ANSA0 = 1;   // set RB3 (AN5, pin 7 of DIP28) as analog pin
    TRISAbits.TRISA0 = 1;   // set RB3 as an input
    
    //Configure pin RB3
    //left sensor 
    ANSELAbits.ANSA1 = 1;   // set RB3 (AN5, pin 7 of DIP28) as analog pin
    TRISAbits.TRISA1 = 1;   // set RB3 as an input
    
    //Configure pin RB3
    //right sensor
    ANSELBbits.ANSB12 = 1;   // set RB3 (AN5, pin 7 of DIP28) as analog pin
    TRISBbits.TRISB12 = 1;   // set RB3 as an input

	ANSELB &= ~(1<<0); // Set RB5 as a digital I/O
    TRISB |= (1<<0);   // configure pin RB5 as input
    CNPUB |= (1<<0);   // Enable pull-up resistor for RB5
 
	waitms(500);
	
	
	
	ADCConf(); // Configure ADC
	
	
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
    
    leftwheelfwd=0;
	rightwheelfwd=0;
	wakeup();
	dance();
		
while(coinnumber < 20)
{	
	forwardfullspeed();
	voltage = ADCRead(9)*3.3/1023.0;
//	printf("voltage = %.2f \r",voltage);
	
	if(voltage >= 0.48)
	{
		ledoff();
		ledredoff();
	//	printf("backup!\n");
		backup();
	}
	count=GetPeriod(100);
	
	if(count>0)
	{
			T=(count*2.0)/(SYSCLK*100.0);
			f=1/T;
			//printf("f=%fHz, Count=%ld        \r", f, count);
	}
	while(f > COINFREQUENCY)
	{	
		ledon();
		ledredon();
		stop();
		waitms(100);
		if(count>0)
		{
			T=(count*2.0)/(SYSCLK*100.0);
			f=1/T;
		//printf("f=%fHz, Count=%ld        \r", f, count);
		}
		if(f <= COINFREQUENCY)
			break;
		//printf("stop!\n");
		reversefullspeed();
	carry=0;
	while(carry<250000)
	carry++;
		stop();
	//	printf("pickupcoin!\n");
		pickupcoin();
		coinnumber++;
	//	printf("finish!\n");
			break;
	}
	
	
	//BLINK LED!
	if(LEDcount1<250)
	{
		ledon();
		ledredoff();
	}
	else if(LEDcount1>=250)
	{
		ledoff();
		ledredon();
		if(LEDcount1>500)
			LEDcount1=0;	
	}
	LEDcount1++;
	if(ADCRead(0)*3.3/1023.0 > 2.85)
		light_count++;
	else if ( light_count>=500)
		break;
	else
		light_count=0;		
	waitms(1);
}// close while (1)

while(coinnumber < 20){ // light tracking mode
    adcval = ADCRead(12); // note that we call pin AN5 (RB3) by it's analog number
        	voltageright=adcval*3.3/1023.0; //voltage at right sensor 
        	
        	adcval=ADCRead(0); //Read ADC value for RB1 (pin 5)
        	voltagefront=adcval*3.3/1023.0; //voltage at front sensor
        	
        	adcval=ADCRead(1); //Read ADC value for RB2 (pin 6)
        	voltageleft=adcval*3.3/1023.0; //voltage at left sensor
        //	printf("Left %.3f, Middle %.3f, Right %.3f\r", voltageleft,voltagefront,voltageright);
        fflush(stdout);
        
		//Logic for motor control
		
		//This while loop for moving forwards
		if(voltagefront>=2.40){
			//printf("f\r");
			leftwheelfwd=100;
			rightwheelfwd=100;
			}
		//This while loop for turning left	
		else if(voltageleft>=2.40){
			//printf("l\r");
			leftwheelfwd=100;
			rightwheelfwd=50;
		
		
		
	}

	
	//This while loop for turning right	
		else if(voltageright>=2.40){
			//printf("r\r");
			
			
			rightwheelfwd=100;
			leftwheelfwd=50;
		
	}
		else{
			rightwheelfwd=0;
			leftwheelfwd=0;
		} 

	voltage = ADCRead(9)*3.3/1023.0;
//	printf("voltage = %.2f \r",voltage);
	
	if(voltage >= 0.48)
	{
		ledoff();
		ledredoff();
	//	printf("backup!\n");
		backup();
	}
	count=GetPeriod(100);
	
	if(count>0)
	{
			T=(count*2.0)/(SYSCLK*100.0);
			f=1/T;
			//printf("f=%fHz, Count=%ld        \r", f, count);
	}
	while(f > COINFREQUENCY)
	{	
		ledon();
		ledredon();
		stop();
		waitms(100);
		if(count>0)
		{
			T=(count*2.0)/(SYSCLK*100.0);
			f=1/T;
		//printf("f=%fHz, Count=%ld        \r", f, count);
		}
		if(f <= COINFREQUENCY)
			break;
		//printf("stop!\n");
		reversefullspeed();
	carry=0;
	while(carry<250000)
	carry++;
		stop();
	//	printf("pickupcoin!\n");
		pickupcoin();
		coinnumber++;
	//	printf("finish!\n");
			break;
	}
	
	
	//BLINK LED!
	if(LEDcount1<250)
	{
		ledon();
		ledredoff();
	}
	else if(LEDcount1>=250)
	{
		ledoff();
		ledredon();
		if(LEDcount1>500)
			LEDcount1=0;	
	}
	LEDcount1++;

}






    
//dance
//dance();
dance();
}// close main

/*
while(1){
    adcval = ADCRead(12); // note that we call pin AN5 (RB3) by it's analog number
        	voltageright=adcval*3.3/1023.0; //voltage at right sensor 
        	
        	adcval=ADCRead(0); //Read ADC value for RB1 (pin 5)
        	voltagefront=adcval*3.3/1023.0; //voltage at front sensor
        	
        	adcval=ADCRead(1); //Read ADC value for RB2 (pin 6)
        	voltageleft=adcval*3.3/1023.0; //voltage at left sensor
        	printf("Left %.3f, Middle %.3f, Right %.3f\r", voltageleft,voltagefront,voltageright);
        fflush(stdout);
        
		//Logic for motor control
		
		//This while loop for moving forwards
		if(voltagefront>=2.40){
			//printf("f\r");
			leftwheelfwd=100;
			rightwheelfwd=100;
			
			
			}
		
		//This while loop for turning left	
		else if(voltageleft>=2.40){
			//printf("l\r");
			leftwheelfwd=100;
			rightwheelfwd=50;
		
		
		
	}

	
	//This while loop for turning right	
		else if(voltageright>=2.40){
			//printf("r\r");
			
			
			rightwheelfwd=100;
			leftwheelfwd=50;
		
	}
		else{
			rightwheelfwd=0;
			leftwheelfwd=0;
		} 
}
}
*/