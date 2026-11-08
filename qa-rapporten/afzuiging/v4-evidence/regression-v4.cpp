#include <cstdio>
#include "regel.h"
using namespace afzuiging;
Opdracht cmd(bool on,int pct,unsigned seq,unsigned boost=0){Opdracht o;o.aan=on;o.pct=pct;o.sessie=7;o.volgnr=seq;o.boost=boost;return o;}
int main(){
 float p[5]={18.606610009304216f,60.55167660322762f,117.0596103955771f,185.60436373636253f,264.66739856124417f};float tp[5]={780,1560,2340,3120,3900};
 Regelaar r;r.laadIjking(p,tp,5);r.stap(1000);r.opdracht(cmd(true,80,1),1000);
 for(unsigned t=1005;t<=61000;t+=5){if(t%1000==0)r.tacho(1950,t);if(t%250==0)r.meting(true,87.20539454628494f,t);r.stap(t);}
 Status s;r.vulStatus(s,61000);printf("unreachable_rpm: requested=%u measured=%u of3900 (50%%), PWM=%u monitoring=%u OK=%u fault=%u fill=%.3f\n",s.pct,s.toeren,s.pwm,s.bewaking,BEW_OK,s.storing,s.vol);
 Regelaar b;b.stap(1000);b.opdracht(cmd(true,80,1),1000);b.opdracht(cmd(true,80,2,1),1000);for(unsigned t=1005;t<=121005;t+=5)b.stap(t);printf("boost_after120s: budget=%u deadline=%u\n",b.boostTegoed,b.boostTot);Regelaar reboot;printf("boost_after_MCU_reset: budget=%u (RAM constructor)\n",reboot.boostTegoed);
 return 0;}
