#include <cstdio>
#include <cmath>
#include "regel.h"
using namespace afzuiging;
static Opdracht cmd(bool aan,int p=80){Opdracht o;o.aan=aan;o.pct=p;o.sessie=17;o.volgnr=1;return o;}
int main(){
 Regelaar r;r.stap(1000);auto o=cmd(true);r.opdracht(o,1000);int reach=0;
 for(unsigned t=1005;t<=2000;t+=5){int g=r.stap(t);if(g==80&&!reach)reach=t-1000;}
 printf("RAMP dt=5ms: at 1s=%d pct, first80=%dms; specified max50pct/s => first80>=1600ms: %s\n",r.gegeven,reach,reach>=1600?"PASS":"FAIL");
 Koppeling k;unsigned char a[6]={1,2,3,4,5,6},b[6]={2,3,4,5,6,7};Koppel v;for(int i=0;i<16;i++)v.sleutel[i]=(unsigned char)i;
 bool first=k.vraag(a,v,1000), second=k.vraag(b,v,2000);printf("PAIR: first=%d second during boot window=%d original sender accepted=%d other sender accepted=%d; explicit confirmation absent\n",first,second,k.aanvaard(a,o),k.aanvaard(b,o));
 Regelaar q;float refs[5]={50,100,150,250,300};q.laadIjking(refs,5);q.opdracht(o,1000);for(unsigned t=1000;t<=9000;t+=250){q.tacho(2000);q.meting(true,250,t);q.stap(t);}Status s;q.vulStatus(s,9000);printf("RANGE at80: fresh=%d calibrated=%d volNaN=%d fault=%u; UI normal branch despite no filter alarm possible\n",s.meetVers,s.geijkt,(int)std::isnan(s.vol),s.storing);
 Regelaar z;z.stap(1000);z.opdracht(o,1000);for(unsigned t=1000;t<=4000;t+=250)z.stap(t);Regelaar reboot;reboot.opdracht(o,5000);for(unsigned t=5000;t<=8000;t+=250)reboot.stap(t);printf("MODULE-ONLY RESET + ongoing AAN commands: before=%d after=%d; full system power cycle differs\n",z.gegeven,reboot.gegeven);
 return 0;
}
