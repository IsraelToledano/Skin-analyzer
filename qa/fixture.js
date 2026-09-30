const T='2026-09-20';
const P=(id,genericName,session,frequency,extra={})=>({id,genericName,brandName:'',notes:'',session,frequency,stepOrder:0,nextDate:T,isOneOff:false,scheduled:true,...extra});
const baseProducts=()=>[
  P(1,'Gentle Gel Cleanser','both','daily'),P(2,'Hydrating Toner','both','daily'),
  P(3,'Retinol Serum 0.5%','pm','weekly'),P(4,'Glycolic Acid Exfoliant','pm','weekly'),
  P(5,'Barrier Repair Moisturizer','both','daily'),P(6,'SPF 50 Sunscreen','am','daily'),
  P(7,'Niacinamide Serum','am','daily')];
const profile=(o={})=>({id:1,name:'T',products:baseProducts(),logs:[],pins:[],procedures:[],routineSync:null,...o});
module.exports={P,baseProducts,profile,T};
