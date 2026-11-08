#include <cstdio>
#include <cmath>
#include "regel.h"
using namespace afzuiging;
Opdracht cmd(unsigned seq=1){Opdracht o;o.aan=true;o.pct=80;o.sessie=7;o.volgnr=seq;return o;}
int main(){
 float w[5]={20,60,120,180,260},t[5]={780,1560,2340,3120,3900};
 Regelaar a; float down[5]={200,150,100,75,50};a.laadIjking(down,t,5);printf("descending_pressure_loaded=%d\n",a.geijkt);
 Regelaar b;float inf[5]={780,1560,2340,3120,INFINITY};b.laadIjking(w,inf,5);printf("infinite_rpm_loaded=%d\n",b.geijkt);
 Regelaar reboot;reboot.stap(1000);printf("new_controller_aan=%d\n",reboot.aan);reboot.opdracht(cmd(100),1100);for(unsigned n=1105;n<5000;n+=5)reboot.stap(n);printf("after_old_knob_ON_repeats: aan=%d pwm=%d\n",reboot.aan,reboot.gegeven);
 Regelaar bypass;bypass.laadIjking(w,t,5);bypass.stap(1000);bypass.opdracht(cmd(),1000);for(unsigned n=1005;n<=20000;n+=5){if(n%1000==0)bypass.tacho(3120,n);if(n%250==0)bypass.meting(true,0.6f*180,n);bypass.stap(n);}Status s;bypass.vulStatus(s,20000);printf("bypass_minus40pct: monitoring=%u OK=%u fault=%u fill=%.3f\n",s.bewaking,BEW_OK,s.storing,s.vol);
 Koppeling k1,k2;uint8_t mac[6]={1,2,3,4,5,6};Koppel k;k.uitdaging=123;printf("two_fresh_modules_same_request: accepted1=%d accepted2=%d\n",k1.vraag(mac,k,5000),k2.vraag(mac,k,5000));
}
