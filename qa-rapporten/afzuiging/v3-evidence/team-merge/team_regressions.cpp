#include <cstdio>
#include <cmath>
#include "regel.h"
using namespace afzuiging;
Opdracht command(int pct=40){Opdracht o;o.aan=true;o.pct=pct;o.sessie=7;o.volgnr=1;return o;}
int main(){
 // Calibration percentage: advance the original code through actual stages.
 Regelaar r;auto o=command();r.tacho(2000);r.meting(true,20,1000);r.opdracht(o,1000);r.stap(1000);o.ijk=1;r.opdracht(o,1001);
 for(unsigned t=1001;t<=21001;t+=250){r.tacho(2000);r.meting(true,20+30*(r.ijkStap?r.ijkStap-1:0),t);r.stap(t);if(t==21001){Status s;r.vulStatus(s,t);printf("CALIBRATION after20s: stage=%u progress=%u%% expected50%%: %s; always-zero claim rejected if PASS\n",s.ijken,s.ijkVoortgang,s.ijkVoortgang==50 ? "PASS" : "FAIL");}}
 // Old filter status is not cleared during speed stabilisation.
 Regelaar st;float refs[5]={20,50,80,110,140};st.laadIjking(refs,5);o=command();st.opdracht(o,1000);
 for(unsigned t=1000;t<=9000;t+=250){st.tacho(2000);st.meting(true,110,t);st.stap(t);}float old=st.vol;o.pct=80;st.opdracht(o,9001);st.stap(9001);printf("STATUS speed40to80: volBefore=%.2f volDuringStabilisation=%.2f (expected unknown): DEFECT_REPRODUCED\n",old,st.vol);
 // The 120s lease can be renewed indefinitely by another boost command.
 Regelaar b;o=command();b.opdracht(o,1000);o.boost=1;b.opdracht(o,1001);
 for(unsigned t=1001;t<=361001;t+=1000){if(t>1001&&(t-1001)%60000==0){++o.boost;b.opdracht(o,t);}b.stap(t);}
 Status bs;b.vulStatus(bs,361001);printf("REPEATED BOOST at360s: duty=%u boostRemaining=%us; no cumulative limiter: DEFECT_REPRODUCED\n",bs.pct,bs.boostRest);
 // Replay at the application layer only. Not a radio/CCMP transport replay proof.
 Koppeling k;unsigned char mac[6]={1,2,3,4,5,6},key[16]={0};k.laad(mac,key);o=command();o.volgnr=100;bool first=k.aanvaard(mac,o);auto n=o;n.sessie=99;n.volgnr=1;bool newer=k.aanvaard(mac,n);bool oldAccepted=k.aanvaard(mac,o);printf("APPLICATION SESSION: first=%d newer=%d earlierSessionAccepted=%d; CCMP transport replay NOT tested\n",first,newer,oldAccepted);
 // Persistent overrange has no distinct Status field.
 Regelaar z;o=command();z.opdracht(o,1000);z.tacho(2000);z.meting(true,480,1000);z.stap(7000);Status zs;z.vulStatus(zs,7000);printf("OVERRANGE 480Pa: internalOutOfRange=%d statusFresh=%d statusMeter=%d fault=%u; specific cause absent from protocol\n",z.buitenBereik,zs.meetVers,zs.meter,zs.storing);
 return 0;
}
