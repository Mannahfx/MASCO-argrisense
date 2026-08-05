export const DISEASES = [
  {
    id:'cmd', name:'Cassava Mosaic Disease', short:'CMD',
    severity:'High', sevColor:'#E65100', sevBg:'#FFF3E0', icon:'Leaf', confidence:94, color:'#E65100',
    desc:'A viral disease spread by whiteflies causing mosaic yellowing on leaves and stunted growth.',
    symptoms:['Yellow-green mosaic patterns on leaves','Leaf distortion and puckering','Stunted plant growth','Reduced tuber size and yield'],
    treatment:['Immediate roguing of infected plants','Deploy yellow sticky traps and Confidor 200 SL','Maintain weed-free field to remove alternative hosts','Source certified CMD-resistant cuttings for next season'],
    prevention:'Use certified disease-free planting material. Control whitefly populations.',
    mannaProducts:['confidor-200sl','harvest-more-foliar'],
  },
  {
    id:'cbsd', name:'Cassava Brown Streak Disease', short:'CBSD',
    severity:'Critical', sevColor:'#B71C1C', sevBg:'#FFEBEE', icon:'Sprout', confidence:88, color:'#B71C1C',
    desc:'A devastating viral disease causing brown streaks on stems and roots, with potential total tuber loss.',
    symptoms:['Yellow-green chlorosis on leaves','Brown necrotic streaks on stems','Corky rot inside tubers','Premature leaf drop'],
    treatment:['Uproot and burn symptomatic plants immediately','Do not use or sell harvested tubers showing corky necrosis','Disinfect all cutting tools with Virkon S between plants','Do not move any stem cuttings from infected fields'],
    prevention:'Plant CBSD-tolerant varieties. Enforce strict tool sanitation.',
    mannaProducts:['virkon-s','confidor-200sl'],
  },
  {
    id:'cbb', name:'Cassava Bacterial Blight', short:'CBB',
    severity:'High', sevColor:'#6A1B9A', sevBg:'#F3E5F5', icon:'Flower', confidence:86, color:'#6A1B9A',
    desc:'A bacterial disease causing angular leaf spots, wilting and dieback of shoots.',
    symptoms:['Angular water-soaked leaf spots','Leaf wilting and yellowing','Stem cankers and gum exudate','Shoot tip dieback'],
    treatment:['Rogue heavily blighted plants and burn crop debris','Avoid working in the field when leaves are wet','Implement crop rotation with maize or legumes','Apply Golden Fertilizer NPK to strengthen plant cell walls'],
    prevention:'Use resistant varieties. Disinfect tools with Virkon S.',
    mannaProducts:['virkon-s','golden-npk'],
  },
  {
    id:'cgm', name:'Cassava Green Mottle', short:'CGM',
    severity:'Moderate', sevColor:'#2E7D32', sevBg:'#E8F5E9', icon:'Shrub', confidence:82, color:'#2E7D32',
    desc:'A viral disease causing green mottling and distortion on young leaves.',
    symptoms:['Green mottling on young leaves','Mild leaf distortion','Reduced plant vigour','Some yield reduction'],
    treatment:['Remove and destroy stunted or mottled plants','Do not use stems from affected plants for propagation','Apply Harvest More Foliar spray to asymptomatic neighbors'],
    prevention:'Use certified clean planting material. Maintain overall field resilience.',
    mannaProducts:['harvest-more-foliar','golden-npk'],
  },
  {
    id:'healthy', name:'Healthy Plant', short:'Healthy',
    severity:'None', sevColor:'#0044B3', sevBg:'#E8EEF8', icon:'CheckCircle', confidence:97, color:'#0044B3',
    desc:'Your cassava plant shows no signs of disease or nutrient deficiency. Keep up the good work!',
    symptoms:['Deep green uniform leaf colouration','No spots, streaks or distortion','Strong upright stem growth','Good canopy coverage'],
    treatment:['Continue current farming practices!','Apply Harvest More Foliar spray monthly','Maintain weed-free environment','Ensure adequate soil moisture','Plan harvest at 10–14 months'],
    prevention:'Keep applying preventive schedule. Inspect weekly.',
    mannaProducts:['harvest-more-foliar','golden-npk'],
  },
];

export const PRODUCTS = [
  { id:'confidor-200sl', name:'Confidor 200 SL',      cat:'Insecticide',     price:'₦4,500',      desc:'Systemic insecticide (Imidacloprid) for effective whitefly control.', dosage:'1.5L/ha', icon:'Bug', color:'#4527A0' },
  { id:'virkon-s',       name:'Virkon S',             cat:'Disinfectant',    price:'₦3,000',      desc:'Broad-spectrum disinfectant for farm tools to prevent mechanical transmission of viruses and bacteria.', dosage:'1% solution', icon:'Shield', color:'#003087' },
  { id:'golden-npk',     name:'Golden Fertilizer NPK',cat:'Fertilizer',      price:'₦18,500/50kg',desc:'Balanced compound fertilizer (15-15-15) for strong crop establishment.', dosage:'200kg/ha', icon:'Beaker', color:'#E65100' },
  { id:'indorama-urea',  name:'Indorama Urea (46% N)',cat:'Fertilizer',      price:'₦14,000/50kg',desc:'High-nitrogen fertilizer for rapid correction of deficiency.', dosage:'50kg/ha top-dress', icon:'Pill', color:'#1565C0' },
  { id:'harvest-more-foliar', name:'Harvest More Foliar', cat:'Foliar',      price:'₦3,500',      desc:'Micronutrient foliar spray for rapid plant recovery and vigour.', dosage:'500ml/ha monthly', icon:'TrendingUp', color:'#2E7D32' },
  { id:'supergro',       name:'SuperGro Stimulant',   cat:'Root Stimulant',  price:'₦5,200',      desc:'Root stimulant to strengthen tuber formation.', dosage:'1L/ha at planting', icon:'TreePine', color:'#558B2F' },
];

export const DEALERS = [
  { id:1, name:'Jubaili Agrotec Ibadan', address:'No. 9, Magazine Road, Jericho, Ibadan, Oyo State', phone:'+234 812 860 0062', distance:'4.2km', inStock:true },
  { id:2, name:'Saro Agrosciences',      address:'Plot 6-8, Block F, Oluyole Industrial Estate, Ibadan', phone:'+234 807 749 4225', distance:'7.8km', inStock:true },
  { id:3, name:'Dizengoff Nigeria',      address:'Plot 328, Block 12, Ogunnusi Road, Omole Phase 1, Lagos', phone:'+234 702 551 6364', distance:'115km', inStock:true },
  { id:4, name:'Jubaili Agrotec Kano',   address:'Km 10, Hadejia Road, Gunduwawa District, Kano', phone:'+234 803 402 2512', distance:'820km', inStock:true },
  { id:5, name:'Indorama Fertilizers',   address:'Indorama Complex, East-West Expressway, Eleme, Rivers State', phone:'+234 703 683 5998', distance:'640km', inStock:false },
];

export const REMINDERS = [
  { id:'1', title:'Tool Disinfection check',  time:'07:00 AM', days:'Mon, Thu', icon:'Shield', enabled:true,  nextDue:'Today'       },
  { id:'2', title:'Inspect for Whitefly',     time:'06:30 AM', days:'Wed, Sat', icon:'Eye', enabled:true,  nextDue:'Tomorrow'    },
  { id:'3', title:'Apply Golden NPK Fertilizer', time:'08:00 AM', days:'Mon',      icon:'Sprout', enabled:true,  nextDue:'Mon, Mar 18' },
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
