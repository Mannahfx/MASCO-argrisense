export const DISEASES = [
  {
    id:'cmd', name:'Cassava Mosaic Disease', short:'CMD',
    severity:'High', sevColor:'#E65100', sevBg:'#FFF3E0', icon:'Leaf', confidence:94, color:'#E65100',
    desc:'A viral disease spread by whiteflies causing mosaic yellowing on leaves and stunted growth.',
    symptoms:['Yellow-green mosaic patterns on leaves','Leaf distortion and puckering','Stunted plant growth','Reduced tuber size and yield'],
    treatment:['Immediate roguing of infected plants','Deploy yellow sticky traps and FMN WhiteFly Control','Maintain weed-free field to remove alternative hosts','Source certified CMD-resistant cuttings for next season'],
    prevention:'Use certified disease-free planting material. Control whitefly populations.',
    fmnProducts:['fmn-whitefly','fmn-growboost'],
  },
  {
    id:'cbsd', name:'Cassava Brown Streak Disease', short:'CBSD',
    severity:'Critical', sevColor:'#B71C1C', sevBg:'#FFEBEE', icon:'Sprout', confidence:88, color:'#B71C1C',
    desc:'A devastating viral disease causing brown streaks on stems and roots, with potential total tuber loss.',
    symptoms:['Yellow-green chlorosis on leaves','Brown necrotic streaks on stems','Corky rot inside tubers','Premature leaf drop'],
    treatment:['Uproot and burn symptomatic plants immediately','Do not use or sell harvested tubers showing corky necrosis','Disinfect all cutting tools with FMN SteriClean between plants','Do not move any stem cuttings from infected fields'],
    prevention:'Plant CBSD-tolerant varieties. Enforce strict tool sanitation.',
    fmnProducts:['fmn-stericlean','fmn-whitefly'],
  },
  {
    id:'cbb', name:'Cassava Bacterial Blight', short:'CBB',
    severity:'High', sevColor:'#6A1B9A', sevBg:'#F3E5F5', icon:'Flower', confidence:86, color:'#6A1B9A',
    desc:'A bacterial disease causing angular leaf spots, wilting and dieback of shoots.',
    symptoms:['Angular water-soaked leaf spots','Leaf wilting and yellowing','Stem cankers and gum exudate','Shoot tip dieback'],
    treatment:['Rogue heavily blighted plants and burn crop debris','Avoid working in the field when leaves are wet','Implement crop rotation with maize or legumes','Apply FMN NPK to strengthen plant cell walls'],
    prevention:'Use resistant varieties. Disinfect tools with FMN SteriClean.',
    fmnProducts:['fmn-stericlean','fmn-npk'],
  },
  {
    id:'cgm', name:'Cassava Green Mottle', short:'CGM',
    severity:'Moderate', sevColor:'#2E7D32', sevBg:'#E8F5E9', icon:'Shrub', confidence:82, color:'#2E7D32',
    desc:'A viral disease causing green mottling and distortion on young leaves.',
    symptoms:['Green mottling on young leaves','Mild leaf distortion','Reduced plant vigour','Some yield reduction'],
    treatment:['Remove and destroy stunted or mottled plants','Do not use stems from affected plants for propagation','Apply FMN GrowBoost foliar spray to asymptomatic neighbors'],
    prevention:'Use certified clean planting material. Maintain overall field resilience.',
    fmnProducts:['fmn-growboost','fmn-npk'],
  },
  {
    id:'healthy', name:'Healthy Plant', short:'Healthy',
    severity:'None', sevColor:'#0044B3', sevBg:'#E8EEF8', icon:'CheckCircle', confidence:97, color:'#0044B3',
    desc:'Your cassava plant shows no signs of disease or nutrient deficiency. Keep up the good work!',
    symptoms:['Deep green uniform leaf colouration','No spots, streaks or distortion','Strong upright stem growth','Good canopy coverage'],
    treatment:['Continue current farming practices!','Apply FMN GrowBoost foliar spray monthly','Maintain weed-free environment','Ensure adequate soil moisture','Plan harvest at 10–14 months'],
    prevention:'Keep applying FMN preventive schedule. Inspect weekly.',
    fmnProducts:['fmn-growboost','fmn-npk'],
  },
];

export const PRODUCTS = [
  { id:'fmn-whitefly',  name:'FMN WhiteFly Control',    cat:'Insecticide',     price:'₦3,200',      desc:'Systemic insecticide for effective whitefly control.', dosage:'1.5L/ha', icon:'Bug', color:'#4527A0' },
  { id:'fmn-stericlean',name:'FMN SteriClean',          cat:'Disinfectant',    price:'₦2,500',      desc:'Broad-spectrum disinfectant for farm tools to prevent mechanical transmission of viruses and bacteria.', dosage:'10% solution', icon:'Shield', color:'#003087' },
  { id:'fmn-npk',       name:'FMN NPK 15-15-15',         cat:'Fertilizer',      price:'₦18,500/50kg',desc:'Balanced compound fertilizer for strong crop establishment.', dosage:'200kg/ha', icon:'Beaker', color:'#E65100' },
  { id:'fmn-urea',      name:'FMN Urea (46% N)',          cat:'Fertilizer',      price:'₦14,000/50kg',desc:'High-nitrogen fertilizer for rapid correction of deficiency.', dosage:'50kg/ha top-dress', icon:'Pill', color:'#1565C0' },
  { id:'fmn-growboost', name:'FMN GrowBoost',             cat:'Foliar',          price:'₦2,800',      desc:'Micronutrient foliar spray for rapid plant recovery and vigour.', dosage:'500ml/ha monthly', icon:'TrendingUp', color:'#2E7D32' },
  { id:'fmn-rootboost', name:'FMN RootBoost',             cat:'Root Stimulant',  price:'₦3,600',      desc:'Root stimulant to strengthen tuber formation.', dosage:'1L/ha at planting', icon:'TreePine', color:'#558B2F' },
];

export const DEALERS = [
  { id:1, name:'FMN AgriStore Ibadan',      address:'Ring Road, Ibadan, Oyo State',         phone:'+234 802 345 6789', distance:'1.2km', inStock:true  },
  { id:2, name:'FMN Agro Depot Lagos',      address:'Agege Motor Road, Lagos',              phone:'+234 803 456 7890', distance:'3.4km', inStock:true  },
  { id:3, name:'FMN Farm Inputs Abeokuta',  address:'Oke-Mosan, Abeokuta, Ogun State',      phone:'+234 704 567 8901', distance:'5.7km', inStock:false },
  { id:4, name:'FMN AgriHub Ilorin',        address:'Tanke Road, Ilorin, Kwara State',      phone:'+234 805 678 9012', distance:'8.1km', inStock:true  },
  { id:5, name:'FMN Rural Inputs Ondo',     address:'Akure Road, Ondo Town',                phone:'+234 706 789 0123', distance:'12.3km',inStock:true  },
];

export const REMINDERS = [
  { id:'1', title:'Tool Disinfection check',  time:'07:00 AM', days:'Mon, Thu', icon:'Shield', enabled:true,  nextDue:'Today'       },
  { id:'2', title:'Inspect for Whitefly',     time:'06:30 AM', days:'Wed, Sat', icon:'Eye', enabled:true,  nextDue:'Tomorrow'    },
  { id:'3', title:'Apply FMN NPK Fertilizer', time:'08:00 AM', days:'Mon',      icon:'Sprout', enabled:true,  nextDue:'Mon, Mar 18' },
  { id:'4', title:'Soil Moisture Check',      time:'05:30 PM', days:'Tue, Fri', icon:'CloudRain', enabled:false, nextDue:'Fri, Mar 14' },
  { id:'5', title:'Weed Control',             time:'07:30 AM', days:'Sat',      icon:'Scissors', enabled:true,  nextDue:'Sat, Mar 15' },
];

export const HISTORY = [
  { id:'h1', date:'Mar 10, 2026', diseaseId:'cmd',     field:'North Field A', treated:true  },
  { id:'h2', date:'Mar 5, 2026',  diseaseId:'healthy', field:'South Field B', treated:false },
  { id:'h3', date:'Feb 28, 2026', diseaseId:'cbb',     field:'East Plots',    treated:true  },
  { id:'h4', date:'Feb 20, 2026', diseaseId:'cbsd',    field:'North Field A', treated:true  },
  { id:'h5', date:'Feb 14, 2026', diseaseId:'cgm',     field:'West Farm',     treated:false },
];
