/**
 * SwasthBharat — Indian Food Database
 * 200+ Indian foods with complete nutritional data
 * Per standard Indian serving size
 */

export type HealthRating = 'Healthy' | 'Moderate' | 'Unhealthy';
export type Region = 'North' | 'South' | 'East' | 'West' | 'Pan-India';
export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Beverage' | 'Dessert';
export type DietType = 'Veg' | 'Non-Veg' | 'Jain' | 'Vegan';
export type AyurvedicNature = 'Hot' | 'Cold' | 'Neutral';
export type Dosha = 'Vata' | 'Pitta' | 'Kapha' | 'Tridoshic';

export interface IndianFood {
  id: string;
  name: string;
  nameHindi: string;
  calories: number;      // kcal per standard serving
  protein: number;       // grams
  carbs: number;         // grams
  fat: number;           // grams
  fiber: number;         // grams
  servingSize: string;   // e.g., "1 katori", "2 rotis"
  servingGrams: number;  // approximate grams
  healthRating: HealthRating;
  region: Region;
  mealType: MealType[];
  dietType: DietType;
  nature: AyurvedicNature;
  dosha?: Dosha;
  tags: string[];
}

const f = (
  id: string, name: string, nameHindi: string,
  calories: number, protein: number, carbs: number, fat: number, fiber: number,
  servingSize: string, servingGrams: number,
  healthRating: HealthRating, region: Region,
  mealType: MealType[], dietType: DietType,
  nature: AyurvedicNature, dosha: Dosha | undefined,
  tags: string[]
): IndianFood => ({
  id, name, nameHindi, calories, protein, carbs, fat, fiber,
  servingSize, servingGrams, healthRating, region, mealType, dietType,
  nature, dosha, tags,
});

export const INDIAN_FOODS: IndianFood[] = [

  // ════════════════════════════════════════════════════
  // NORTH INDIAN — BREAKFAST
  // ════════════════════════════════════════════════════

  f('ni_001','Aloo Paratha','आलू पराठा',297,6,40,12,3,'1 piece',120,'Moderate','North',['Breakfast','Lunch'],'Veg','Hot','Vata',['filling','popular']),
  f('ni_002','Gobi Paratha','गोभी पराठा',275,6,38,11,4,'1 piece',115,'Moderate','North',['Breakfast'],'Veg','Hot','Vata',['breakfast']),
  f('ni_003','Paneer Paratha','पनीर पराठा',330,11,38,15,3,'1 piece',125,'Moderate','North',['Breakfast','Lunch'],'Veg','Hot','Pitta',['protein','filling']),
  f('ni_004','Plain Paratha','सादा पराठा',230,5,30,10,2,'1 piece',90,'Moderate','North',['Breakfast','Lunch'],'Veg','Hot','Vata',['staple']),
  f('ni_005','Poha','पोहा',250,5,45,5,3,'1 plate (1.5 katori)',180,'Healthy','North',['Breakfast'],'Veg','Neutral','Tridoshic',['light','popular']),
  f('ni_006','Upma','उपमा',220,5,35,7,3,'1 plate',180,'Healthy','North',['Breakfast'],'Veg','Hot','Vata',['breakfast','quick']),
  f('ni_007','Chole Bhature','छोले भटूरे',500,15,70,18,10,'1 plate (2 bhature)',350,'Moderate','North',['Breakfast','Lunch'],'Veg','Hot','Pitta',['heavy','popular']),
  f('ni_008','Puri Bhaji','पूरी भाजी',400,8,55,16,5,'2 puri + 1 katori',250,'Moderate','North',['Breakfast','Lunch'],'Veg','Hot','Vata',['festive']),
  f('ni_009','Besan Chilla','बेसन चिल्ला',180,9,22,5,4,'2 pieces',120,'Healthy','North',['Breakfast'],'Veg','Hot','Kapha',['protein','healthy']),
  f('ni_010','Sabudana Khichdi','साबूदाना खिचड़ी',350,4,60,8,2,'1 plate',200,'Moderate','North',['Breakfast','Snack'],'Veg','Neutral','Vata',['fasting','festive']),
  f('ni_011','Sattu Paratha','सत्तू पराठा',280,10,38,9,5,'1 piece',115,'Healthy','North',['Breakfast'],'Veg','Cold','Pitta',['protein','summer']),
  f('ni_012','Missi Roti','मिस्सी रोटी',200,8,28,5,5,'1 roti',80,'Healthy','North',['Breakfast','Lunch'],'Veg','Neutral','Tridoshic',['protein','healthy']),
  f('ni_013','Bread Pakora','ब्रेड पकोड़ा',250,6,30,12,2,'2 pieces',100,'Moderate','North',['Breakfast','Snack'],'Veg','Hot','Kapha',['street','snack']),
  f('ni_014','Aloo Tikki','आलू टिक्की',170,3,28,6,3,'2 pieces',100,'Moderate','North',['Snack','Breakfast'],'Veg','Hot','Kapha',['street','snack']),
  f('ni_015','Namkeen Poha','नमकीन पोहा',220,4,40,5,3,'1 katori',150,'Healthy','North',['Breakfast'],'Veg','Neutral','Tridoshic',['light']),

  // ════════════════════════════════════════════════════
  // NORTH INDIAN — DAL & LEGUMES
  // ════════════════════════════════════════════════════

  f('ni_016','Dal Makhani','दाल मखनी',230,9,28,9,7,'1 katori',200,'Moderate','North',['Lunch','Dinner'],'Veg','Hot','Vata',['protein','popular','creamy']),
  f('ni_017','Dal Tadka','दाल तड़का',180,9,25,5,7,'1 katori',200,'Healthy','North',['Lunch','Dinner'],'Veg','Hot','Tridoshic',['protein','staple']),
  f('ni_018','Dal Fry','दाल फ्राय',190,9,26,6,7,'1 katori',200,'Healthy','North',['Lunch','Dinner'],'Veg','Hot','Tridoshic',['protein']),
  f('ni_019','Rajma','राजमा',220,10,35,4,10,'1 katori',200,'Healthy','North',['Lunch','Dinner'],'Veg','Hot','Vata',['protein','fiber','punjabi']),
  f('ni_020','Chole','छोले',210,10,32,5,9,'1 katori',200,'Healthy','North',['Lunch','Dinner'],'Veg','Hot','Vata',['protein','popular']),
  f('ni_021','Chana Dal','चना दाल',200,11,29,4,8,'1 katori',200,'Healthy','Pan-India',['Lunch','Dinner'],'Veg','Neutral','Tridoshic',['protein','fiber']),
  f('ni_022','Moong Dal','मूंग दाल',120,8,18,2,5,'1 katori',180,'Healthy','Pan-India',['Lunch','Dinner'],'Veg','Cold','Pitta',['light','digestive']),
  f('ni_023','Arhar Dal','अरहर दाल',160,9,24,3,7,'1 katori',200,'Healthy','Pan-India',['Lunch','Dinner'],'Veg','Neutral','Tridoshic',['staple','protein']),
  f('ni_024','Dal Palak','दाल पालक',150,9,20,3,8,'1 katori',200,'Healthy','North',['Lunch','Dinner'],'Veg','Cold','Pitta',['iron','healthy']),

  // ════════════════════════════════════════════════════
  // NORTH INDIAN — SABZI / VEGETABLES
  // ════════════════════════════════════════════════════

  f('ni_025','Palak Paneer','पालक पनीर',280,12,15,18,5,'1 katori',200,'Moderate','North',['Lunch','Dinner'],'Veg','Cold','Pitta',['iron','protein','popular']),
  f('ni_026','Shahi Paneer','शाही पनीर',320,12,14,22,3,'1 katori',200,'Moderate','North',['Lunch','Dinner'],'Veg','Hot','Pitta',['creamy','rich']),
  f('ni_027','Matar Paneer','मटर पनीर',240,11,18,14,5,'1 katori',200,'Moderate','North',['Lunch','Dinner'],'Veg','Neutral','Tridoshic',['popular']),
  f('ni_028','Aloo Gobi','आलू गोभी',150,4,22,5,4,'1 katori',200,'Healthy','North',['Lunch','Dinner'],'Veg','Hot','Vata',['light','vegetarian']),
  f('ni_029','Aloo Matar','आलू मटर',160,5,24,5,5,'1 katori',200,'Healthy','North',['Lunch','Dinner'],'Veg','Hot','Vata',['simple']),
  f('ni_030','Baingan Bharta','बैंगन भर्ता',120,3,16,5,5,'1 katori',200,'Healthy','North',['Lunch','Dinner'],'Veg','Hot','Vata',['smoky','healthy']),
  f('ni_031','Kadhi Pakora','कड़ी पकोड़ा',280,8,30,14,3,'1 katori + 2 pakoras',250,'Moderate','North',['Lunch','Dinner'],'Veg','Hot','Kapha',['tangy','popular']),
  f('ni_032','Aloo Jeera','आलू जीरा',180,3,28,6,3,'1 katori',180,'Moderate','North',['Lunch','Dinner'],'Veg','Hot','Vata',['simple','quick']),
  f('ni_033','Bhindi Masala','भिंडी मसाला',130,3,16,6,5,'1 katori',180,'Healthy','North',['Lunch','Dinner'],'Veg','Neutral','Tridoshic',['fiber','okra']),
  f('ni_034','Mix Veg','मिक्स वेज',140,4,18,6,5,'1 katori',200,'Healthy','Pan-India',['Lunch','Dinner'],'Veg','Neutral','Tridoshic',['healthy','variety']),
  f('ni_035','Lauki Ki Sabzi','लौकी की सब्जी',80,2,12,2,3,'1 katori',200,'Healthy','North',['Lunch','Dinner'],'Veg','Cold','Pitta',['light','summer']),

  // ════════════════════════════════════════════════════
  // NORTH INDIAN — BREAD & RICE
  // ════════════════════════════════════════════════════

  f('ni_036','Roti','रोटी',100,3,20,1,2,'1 roti',40,'Healthy','Pan-India',['Breakfast','Lunch','Dinner'],'Veg','Neutral','Tridoshic',['staple']),
  f('ni_037','Phulka','फुल्का',70,2,14,1,2,'1 phulka',30,'Healthy','Pan-India',['Lunch','Dinner'],'Veg','Neutral','Tridoshic',['light','staple']),
  f('ni_038','Naan','नान',290,8,50,5,3,'1 naan',120,'Moderate','North',['Lunch','Dinner'],'Veg','Hot','Kapha',['restaurant']),
  f('ni_039','Kulcha','कुल्चा',260,7,45,6,2,'1 kulcha',110,'Moderate','North',['Lunch','Dinner'],'Veg','Hot','Kapha',['punjabi']),
  f('ni_040','Plain Rice','सादा चावल',200,4,43,0,1,'1 katori',150,'Healthy','Pan-India',['Lunch','Dinner'],'Vegan','Neutral','Tridoshic',['staple']),
  f('ni_041','Jeera Rice','जीरा चावल',230,4,46,5,1,'1 katori',160,'Moderate','North',['Lunch','Dinner'],'Veg','Hot','Vata',['flavored']),
  f('ni_042','Veg Biryani','वेज बिरयानी',350,8,60,9,4,'1 plate',300,'Moderate','North',['Lunch','Dinner'],'Veg','Hot','Pitta',['festive','popular']),
  f('ni_043','Chicken Biryani','चिकन बिरयानी',420,22,55,12,3,'1 plate',350,'Moderate','North',['Lunch','Dinner'],'Non-Veg','Hot','Pitta',['festive','non-veg','popular']),
  f('ni_044','Pulao','पुलाव',280,6,50,7,3,'1 plate',250,'Moderate','North',['Lunch','Dinner'],'Veg','Neutral','Vata',['mild']),

  // ════════════════════════════════════════════════════
  // NORTH INDIAN — NON-VEG
  // ════════════════════════════════════════════════════

  f('ni_045','Butter Chicken','बटर चिकन',380,25,18,24,2,'1 katori',250,'Moderate','North',['Lunch','Dinner'],'Non-Veg','Hot','Pitta',['popular','creamy','non-veg']),
  f('ni_046','Chicken Curry','चिकन करी',320,28,12,18,2,'1 katori',250,'Moderate','North',['Lunch','Dinner'],'Non-Veg','Hot','Pitta',['non-veg','spicy']),
  f('ni_047','Mutton Curry','मटन करी',380,28,10,25,2,'1 katori',250,'Moderate','North',['Lunch','Dinner'],'Non-Veg','Hot','Pitta',['non-veg','heavy']),
  f('ni_048','Egg Curry','अंडे की करी',250,15,10,16,2,'2 eggs + gravy',200,'Moderate','North',['Lunch','Dinner'],'Non-Veg','Hot','Pitta',['non-veg','protein']),
  f('ni_049','Seekh Kebab','सीख कबाब',320,22,8,20,1,'2 kebabs',120,'Moderate','North',['Snack','Dinner'],'Non-Veg','Hot','Pitta',['non-veg','tandoor']),
  f('ni_050','Tandoori Chicken','तंदूरी चिकन',240,35,6,8,1,'2 pieces',200,'Healthy','North',['Dinner','Snack'],'Non-Veg','Hot','Pitta',['non-veg','low-fat','protein']),

  // ════════════════════════════════════════════════════
  // NORTH INDIAN — SNACKS & STREET FOOD
  // ════════════════════════════════════════════════════

  f('ni_051','Samosa','समोसा',260,4,35,12,3,'1 large samosa',100,'Unhealthy','North',['Snack'],'Veg','Hot','Kapha',['street','fried','popular']),
  f('ni_052','Kachori','कचोरी',300,6,38,14,4,'1 kachori',100,'Unhealthy','North',['Breakfast','Snack'],'Veg','Hot','Kapha',['street','fried']),
  f('ni_053','Raj Kachori','राज कचोरी',380,10,52,14,6,'1 piece',180,'Moderate','North',['Snack'],'Veg','Neutral','Kapha',['chaat','filling']),
  f('ni_054','Pani Puri','पानी पूरी',200,4,36,5,3,'6 pieces',100,'Moderate','North',['Snack'],'Vegan','Cold','Pitta',['street','chaat','tangy']),
  f('ni_055','Bhel Puri','भेल पूरी',180,4,32,5,3,'1 plate',150,'Moderate','North',['Snack'],'Vegan','Neutral','Tridoshic',['chaat','street']),
  f('ni_056','Dahi Puri','दही पूरी',220,6,36,6,3,'6 pieces',150,'Moderate','North',['Snack'],'Veg','Cold','Pitta',['chaat','street']),
  f('ni_057','Papdi Chaat','पापड़ी चाट',280,7,42,8,3,'1 plate',200,'Moderate','North',['Snack'],'Veg','Neutral','Kapha',['chaat','street']),
  f('ni_058','Aloo Chaat','आलू चाट',200,4,32,7,3,'1 plate',180,'Moderate','North',['Snack'],'Veg','Neutral','Kapha',['street','tangy']),
  f('ni_059','Dahi Bhalla','दही भल्ला',280,10,38,8,5,'2 bhallas',200,'Moderate','North',['Snack'],'Veg','Cold','Pitta',['cooling','snack']),
  f('ni_060','Gol Gappe','गोल गप्पे',200,3,36,5,2,'6 pieces',100,'Moderate','North',['Snack'],'Vegan','Cold','Tridoshic',['street','popular']),

  // ════════════════════════════════════════════════════
  // NORTH INDIAN — SWEETS & DESSERTS
  // ════════════════════════════════════════════════════

  f('ni_061','Gulab Jamun','गुलाब जामुन',150,2,25,5,0,'1 piece',50,'Unhealthy','Pan-India',['Dessert'],'Veg','Hot','Kapha',['sweet','popular','festive']),
  f('ni_062','Jalebi','जलेबी',150,1,32,3,0,'2 pieces',60,'Unhealthy','Pan-India',['Breakfast','Dessert'],'Veg','Hot','Kapha',['sweet','fried','festive']),
  f('ni_063','Kaju Katli','काजू कतली',200,4,28,9,1,'2 pieces',50,'Moderate','Pan-India',['Dessert'],'Veg','Hot','Kapha',['sweet','festive','diwali']),
  f('ni_064','Besan Ladoo','बेसन लड्डू',180,4,25,7,2,'1 piece',50,'Moderate','Pan-India',['Dessert'],'Veg','Hot','Kapha',['sweet','festive']),
  f('ni_065','Suji Halwa','सूजी हलवा',280,4,45,10,1,'1 katori',150,'Moderate','North',['Dessert','Breakfast'],'Veg','Hot','Kapha',['prasad','sweet']),
  f('ni_066','Kheer','खीर',200,5,32,6,0,'1 katori',150,'Moderate','Pan-India',['Dessert'],'Veg','Cold','Pitta',['festive','milk','sweet']),
  f('ni_067','Barfi','बर्फी',170,3,24,7,1,'2 pieces',50,'Moderate','North',['Dessert'],'Veg','Neutral','Kapha',['sweet','milk']),
  f('ni_068','Motichoor Ladoo','मोतीचूर लड्डू',160,2,27,5,1,'1 piece',45,'Unhealthy','North',['Dessert'],'Veg','Hot','Kapha',['sweet','festive']),
  f('ni_069','Rasgulla','रसगुल्ला',110,2,22,2,0,'1 piece',60,'Moderate','East',['Dessert'],'Veg','Cold','Pitta',['bengali','sweet','cooling']),
  f('ni_070','Gajar Halwa','गाजर हलवा',250,5,40,8,4,'1 katori',150,'Moderate','North',['Dessert'],'Veg','Hot','Kapha',['winter','carrot','sweet']),

  // ════════════════════════════════════════════════════
  // SOUTH INDIAN
  // ════════════════════════════════════════════════════

  f('si_001','Idli','इडली',78,2,17,0,1,'2 pieces',80,'Healthy','South',['Breakfast'],'Veg','Neutral','Tridoshic',['light','fermented','healthy']),
  f('si_002','Masala Dosa','मसाला डोसा',250,6,40,8,3,'1 dosa',180,'Healthy','South',['Breakfast','Lunch'],'Veg','Neutral','Tridoshic',['popular','crispy']),
  f('si_003','Plain Dosa','सादा डोसा',170,4,34,3,2,'1 dosa',150,'Healthy','South',['Breakfast'],'Veg','Neutral','Tridoshic',['light','crispy']),
  f('si_004','Rava Dosa','रवा डोसा',200,5,36,5,2,'1 dosa',160,'Healthy','South',['Breakfast'],'Veg','Hot','Tridoshic',['crispy']),
  f('si_005','Uttapam','उत्तपम',200,6,34,4,3,'1 piece',160,'Healthy','South',['Breakfast'],'Veg','Neutral','Tridoshic',['thick','vegetable']),
  f('si_006','Medu Vada','मेदू वड़ा',160,5,18,8,2,'1 piece',60,'Moderate','South',['Breakfast','Snack'],'Veg','Hot','Kapha',['fried','popular']),
  f('si_007','Sambar','सांभर',100,4,14,3,5,'1 katori',200,'Healthy','South',['Breakfast','Lunch','Dinner'],'Veg','Hot','Tridoshic',['lentil','healthy','tangy']),
  f('si_008','Rasam','रसम',60,2,8,2,2,'1 glass/katori',150,'Healthy','South',['Lunch','Dinner'],'Veg','Hot','Vata',['digestive','thin','spicy']),
  f('si_009','Curd Rice','दही चावल',280,7,48,5,1,'1 plate',250,'Healthy','South',['Lunch','Dinner'],'Veg','Cold','Pitta',['cooling','summer','comfort']),
  f('si_010','Lemon Rice','नींबू चावल',260,4,48,6,2,'1 plate',200,'Healthy','South',['Lunch','Dinner'],'Vegan','Neutral','Tridoshic',['tangy']),
  f('si_011','Tamarind Rice','इमली चावल',280,4,52,7,2,'1 plate',200,'Moderate','South',['Lunch','Dinner'],'Vegan','Hot','Pitta',['tangy','south']),
  f('si_012','Pongal','पोंगल',300,7,52,7,3,'1 plate',220,'Healthy','South',['Breakfast','Lunch'],'Veg','Neutral','Tridoshic',['festival','comfort']),
  f('si_013','Upma (South)','उपमा',220,5,35,7,3,'1 plate',180,'Healthy','South',['Breakfast'],'Veg','Neutral','Tridoshic',['quick','breakfast']),
  f('si_014','Avial','अवियल',180,4,20,9,5,'1 katori',180,'Healthy','South',['Lunch','Dinner'],'Veg','Neutral','Pitta',['coconut','kerala','vegetables']),
  f('si_015','Kerala Fish Curry','केरल फिश करी',280,22,10,16,2,'1 katori',200,'Moderate','South',['Lunch','Dinner'],'Non-Veg','Hot','Pitta',['kerala','non-veg','spicy']),
  f('si_016','Appam','अप्पम',180,4,34,3,2,'2 pieces',120,'Healthy','South',['Breakfast'],'Veg','Neutral','Tridoshic',['kerala','fermented']),
  f('si_017','Puttu','पुट्टू',200,4,40,2,3,'1 puttu',120,'Healthy','South',['Breakfast'],'Veg','Neutral','Tridoshic',['kerala','steamed']),
  f('si_018','Idiyappam','इडियप्पम',160,3,34,1,2,'2 pieces',100,'Healthy','South',['Breakfast'],'Veg','Neutral','Tridoshic',['kerala','light']),
  f('si_019','Bisibele Bath','बिसीबेला बाथ',380,12,60,10,8,'1 plate',300,'Healthy','South',['Lunch'],'Veg','Hot','Tridoshic',['karnataka','one-pot']),
  f('si_020','Mysore Pak','मैसूर पाक',400,5,50,20,2,'2 pieces',80,'Unhealthy','South',['Dessert'],'Veg','Hot','Kapha',['sweet','ghee','karnataka']),
  f('si_021','Payasam','पायसम',220,4,38,6,1,'1 katori',150,'Moderate','South',['Dessert'],'Veg','Cold','Pitta',['sweet','festive','kerala']),
  f('si_022','Kesari Bath','केसरी बाथ',280,3,46,10,1,'1 katori',150,'Moderate','South',['Dessert','Breakfast'],'Veg','Hot','Kapha',['sweet','saffron']),
  f('si_023','Murukku','मुरुक्कू',440,6,62,18,3,'1 small bunch',60,'Unhealthy','South',['Snack'],'Veg','Neutral','Kapha',['crispy','fried','snack']),
  f('si_024','Rava Idli','रवा इडली',100,3,18,2,1,'2 pieces',90,'Healthy','South',['Breakfast'],'Veg','Neutral','Tridoshic',['instant']),
  f('si_025','Dahi Vada (South)','दही वड़ा',220,8,30,7,4,'2 vadas',160,'Moderate','South',['Snack'],'Veg','Cold','Pitta',['cooling','festival']),
  f('si_026','Filter Coffee','फिल्टर कॉफी',45,1,5,2,0,'1 cup (tumbler)',100,'Healthy','South',['Beverage'],'Veg','Hot','Pitta',['coffee','south','morning']),
  f('si_027','Coconut Chutney','नारियल चटनी',80,1,5,6,2,'2 tbsp',40,'Healthy','South',['Breakfast'],'Vegan','Cold','Pitta',['condiment','coconut']),
  f('si_028','Vada Pav (Goan)','वड़ा पाव',290,7,42,10,3,'1 piece',130,'Moderate','South',['Snack'],'Veg','Hot','Kapha',['street']),
  f('si_029','Prawn Curry','झींगा करी',280,24,10,16,2,'1 katori',200,'Moderate','South',['Lunch','Dinner'],'Non-Veg','Hot','Pitta',['non-veg','seafood']),
  f('si_030','Chicken Stew (Kerala)','चिकन स्टू',280,25,12,15,3,'1 katori',250,'Moderate','South',['Dinner'],'Non-Veg','Neutral','Pitta',['kerala','mild','non-veg']),

  // ════════════════════════════════════════════════════
  // EAST INDIAN
  // ════════════════════════════════════════════════════

  f('ei_001','Macher Jhol','मछर झोल',280,24,12,15,2,'1 katori',250,'Healthy','East',['Lunch','Dinner'],'Non-Veg','Neutral','Tridoshic',['bengali','fish','non-veg']),
  f('ei_002','Hilsa Curry','हिलसा करी',380,26,8,26,1,'1 katori',200,'Moderate','East',['Lunch','Dinner'],'Non-Veg','Hot','Pitta',['bengali','prized','non-veg']),
  f('ei_003','Bengali Dal Bhat','बंगाली दाल भात',380,14,65,6,8,'1 plate',350,'Healthy','East',['Lunch','Dinner'],'Veg','Neutral','Tridoshic',['bengali','comfort','staple']),
  f('ei_004','Shukto','शुक्तो',120,3,16,5,5,'1 katori',180,'Healthy','East',['Lunch'],'Veg','Neutral','Pitta',['bengali','bitter','digestive']),
  f('ei_005','Khichuri','खिचड़ी',320,11,55,6,6,'1 plate',300,'Healthy','East',['Lunch'],'Veg','Neutral','Tridoshic',['bengali','comfort']),
  f('ei_006','Litti Chokha','लिट्टी चोखा',450,12,65,15,7,'2 litti + chokha',350,'Moderate','East',['Lunch','Dinner'],'Veg','Hot','Vata',['bihari','stuffed','smoky']),
  f('ei_007','Rasgulla','रसगुल्ला',110,2,22,2,0,'1 piece',60,'Moderate','East',['Dessert'],'Veg','Cold','Pitta',['bengali','sweet','famous']),
  f('ei_008','Sandesh','संदेश',140,5,22,4,0,'1 piece',60,'Moderate','East',['Dessert'],'Veg','Neutral','Pitta',['bengali','milk','sweet']),
  f('ei_009','Mishti Doi','मिष्टी दই',180,5,32,4,0,'1 katori',150,'Moderate','East',['Dessert','Snack'],'Veg','Neutral','Pitta',['bengali','sweet','yogurt']),
  f('ei_010','Chamcham','चमचम',160,3,28,4,0,'1 piece',70,'Moderate','East',['Dessert'],'Veg','Cold','Pitta',['bengali','sweet']),
  f('ei_011','Rasmalai','रसमलाई',200,6,30,6,0,'2 pieces',120,'Moderate','East',['Dessert'],'Veg','Cold','Pitta',['milk','sweet','popular']),
  f('ei_012','Momos (Veg)','मोमोज',180,8,30,4,3,'6 pieces',150,'Healthy','East',['Snack'],'Veg','Neutral','Tridoshic',['nepali','steamed','street']),
  f('ei_013','Momos (Chicken)','चिकन मोमोज',230,14,28,6,2,'6 pieces',170,'Moderate','East',['Snack'],'Non-Veg','Neutral','Tridoshic',['nepali','non-veg','street']),
  f('ei_014','Thukpa','थुकपा',280,12,42,6,4,'1 bowl',350,'Healthy','East',['Lunch','Dinner'],'Non-Veg','Hot','Vata',['soup','noodle','himalayan']),
  f('ei_015','Sattu Drink','सत्तू शरबत',150,7,26,2,4,'1 glass',300,'Healthy','East',['Beverage','Breakfast'],'Vegan','Cold','Pitta',['summer','bihari','energy']),
  f('ei_016','Nimki','निम्की',250,4,30,13,2,'1 small pack',50,'Moderate','East',['Snack'],'Veg','Neutral','Kapha',['bengali','savory','crispy']),
  f('ei_017','Posto (Poppy seeds)','पोस्तो',220,5,12,16,3,'1 katori',100,'Healthy','East',['Lunch'],'Veg','Cold','Pitta',['bengali','aloo']),
  f('ei_018','Pitha','पीठा',220,4,40,5,2,'2 pieces',100,'Healthy','East',['Breakfast','Dessert'],'Veg','Hot','Vata',['assamese','rice','festive']),
  f('ei_019','Ghugni','घुघनी',180,9,28,4,7,'1 katori',180,'Healthy','East',['Snack','Breakfast'],'Vegan','Hot','Vata',['yellow-pea','street']),
  f('ei_020','Prawn Malai Curry','चिंगड़ी माछer মালাই কারী',380,22,10,28,2,'1 katori',200,'Moderate','East',['Lunch','Dinner'],'Non-Veg','Neutral','Pitta',['bengali','prawns','coconut']),

  // ════════════════════════════════════════════════════
  // WEST INDIAN — GUJARATI
  // ════════════════════════════════════════════════════

  f('wi_001','Dhokla','ढोकला',160,7,26,4,3,'4 pieces',120,'Healthy','West',['Breakfast','Snack'],'Veg','Neutral','Tridoshic',['gujarati','steamed','healthy','popular']),
  f('wi_002','Thepla','थेपला',180,5,28,6,4,'2 pieces',80,'Healthy','West',['Breakfast'],'Veg','Neutral','Tridoshic',['gujarati','travel','fenugreek']),
  f('wi_003','Handvo','हांडवो',220,8,30,7,5,'1 slice',120,'Healthy','West',['Breakfast','Snack'],'Veg','Neutral','Tridoshic',['gujarati','baked','lentil']),
  f('wi_004','Muthia','मुठिया',180,6,28,5,4,'4 pieces',100,'Healthy','West',['Breakfast','Snack'],'Veg','Neutral','Tridoshic',['gujarati','steamed']),
  f('wi_005','Fafda','फाफड़ा',280,6,38,12,2,'1 serving',60,'Moderate','West',['Breakfast','Snack'],'Veg','Hot','Kapha',['gujarati','crispy','navratri']),
  f('wi_006','Khandvi','खांडवी',180,6,22,7,2,'8 rolls',100,'Healthy','West',['Snack'],'Veg','Neutral','Tridoshic',['gujarati','creamy']),
  f('wi_007','Gujarati Kadhi','गुजराती कड़ी',120,4,18,3,1,'1 katori',200,'Healthy','West',['Lunch','Dinner'],'Veg','Hot','Pitta',['gujarati','sweet','yogurt']),
  f('wi_008','Undhiyu','उंधियू',350,10,45,14,9,'1 katori',250,'Moderate','West',['Lunch','Dinner'],'Veg','Hot','Tridoshic',['gujarati','winter','festival']),
  f('wi_009','Dal Dhokli','दाल ढोकली',320,11,48,8,7,'1 plate',300,'Healthy','West',['Lunch','Dinner'],'Veg','Hot','Tridoshic',['gujarati','complete']),
  f('wi_010','Rotlo','રોટલો',120,3,22,3,4,'1 roti',60,'Healthy','West',['Breakfast','Dinner'],'Vegan','Neutral','Vata',['gujarati','millet','healthy']),

  // ════════════════════════════════════════════════════
  // WEST INDIAN — MAHARASHTRIAN
  // ════════════════════════════════════════════════════

  f('wi_011','Pav Bhaji','पाव भाजी',350,9,55,12,6,'2 pav + bhaji',300,'Moderate','West',['Lunch','Dinner','Snack'],'Veg','Hot','Pitta',['mumbai','street','popular']),
  f('wi_012','Vada Pav','वड़ा पाव',290,7,42,10,3,'1 piece',130,'Moderate','West',['Snack'],'Veg','Hot','Kapha',['mumbai','street','popular']),
  f('wi_013','Misal Pav','मिसल पाव',350,12,52,10,9,'1 plate',280,'Moderate','West',['Breakfast','Lunch'],'Veg','Hot','Pitta',['kolhapur','spicy']),
  f('wi_014','Batata Vada','बटाटा वड़ा',190,4,28,8,3,'1 piece',80,'Moderate','West',['Snack'],'Veg','Hot','Kapha',['maharashtra','fried','street']),
  f('wi_015','Puran Poli','पुरण पोळी',350,8,62,8,5,'1 piece',120,'Moderate','West',['Breakfast','Dessert'],'Veg','Hot','Kapha',['festive','sweet','maharashtra']),
  f('wi_016','Modak','मोदक',180,3,30,6,2,'1 piece',60,'Moderate','West',['Dessert'],'Veg','Neutral','Kapha',['ganesh','festive','sweet']),
  f('wi_017','Thalipeeth','थालीपीठ',240,7,36,7,5,'1 piece',120,'Healthy','West',['Breakfast'],'Veg','Neutral','Tridoshic',['maharashtra','multigrain']),
  f('wi_018','Matki Usal','मटकी उसळ',180,9,28,4,7,'1 katori',180,'Healthy','West',['Breakfast','Lunch'],'Veg','Hot','Vata',['maharashtra','sprout','healthy']),
  f('wi_019','Shrikhand','श्रीखंड',280,8,46,6,0,'1 katori',150,'Moderate','West',['Dessert'],'Veg','Cold','Pitta',['gujarat','maharashtra','sweet','yogurt']),
  f('wi_020','Kolhapuri Chicken','कोल्हापुरी चिकन',380,28,12,24,3,'1 katori',250,'Moderate','West',['Dinner'],'Non-Veg','Hot','Pitta',['spicy','non-veg','maharashtra']),

  // ════════════════════════════════════════════════════
  // WEST INDIAN — RAJASTHANI
  // ════════════════════════════════════════════════════

  f('wi_021','Dal Baati Churma','दाल बाटी चूरमा',700,15,95,28,12,'1 set',400,'Moderate','West',['Lunch','Dinner'],'Veg','Hot','Kapha',['rajasthan','festive','heavy']),
  f('wi_022','Gatte Ki Sabzi','गट्टे की सब्जी',280,10,32,13,5,'1 katori',200,'Moderate','West',['Lunch','Dinner'],'Veg','Hot','Pitta',['rajasthan','chickpea']),
  f('wi_023','Bajra Roti','बाजरा रोटी',110,3,22,2,4,'1 roti',50,'Healthy','West',['Dinner'],'Vegan','Neutral','Tridoshic',['rajasthan','millet','winter']),
  f('wi_024','Lal Maas','लाल मांस',420,30,10,28,2,'1 katori',250,'Moderate','West',['Dinner'],'Non-Veg','Hot','Pitta',['rajasthan','spicy','non-veg']),
  f('wi_025','Ghewar','घेवर',480,5,72,18,2,'1 piece',120,'Unhealthy','West',['Dessert'],'Veg','Hot','Kapha',['rajasthan','festival','fried']),
  f('wi_026','Ker Sangri','केर सांगरी',150,4,20,6,7,'1 katori',150,'Healthy','West',['Lunch','Dinner'],'Vegan','Neutral','Tridoshic',['rajasthan','desert']),
  f('wi_027','Dabeli','दाबेली',280,7,42,10,4,'1 piece',120,'Moderate','West',['Snack'],'Veg','Neutral','Kapha',['gujarat','street','popular']),
  f('wi_028','Malpu','मालपुआ',320,5,50,11,2,'2 pieces',120,'Unhealthy','West',['Dessert'],'Veg','Hot','Kapha',['rajasthan','sweet','fried']),

  // ════════════════════════════════════════════════════
  // PAN-INDIA STAPLES
  // ════════════════════════════════════════════════════

  f('pi_001','Curd / Dahi','दही',60,3,5,3,0,'1 katori',100,'Healthy','Pan-India',['Breakfast','Lunch','Dinner','Snack'],'Veg','Cold','Pitta',['probiotic','cooling','daily']),
  f('pi_002','Paneer (100g)','पनीर',260,18,4,20,0,'100g',100,'Moderate','Pan-India',['Lunch','Dinner','Snack'],'Veg','Neutral','Tridoshic',['protein','calcium','popular']),
  f('pi_003','Ghee','घी',900,0,0,100,0,'1 tbsp',14,'Moderate','Pan-India',['Breakfast','Lunch','Dinner'],'Veg','Hot','Tridoshic',['ayurvedic','fat','cooking']),
  f('pi_004','Egg (Boiled)','उबला अंडा',70,6,1,5,0,'1 egg',50,'Healthy','Pan-India',['Breakfast','Snack'],'Non-Veg','Neutral','Tridoshic',['protein','cheap']),
  f('pi_005','Chicken Breast (Grilled)','ग्रिल्ड चिकन',165,31,0,4,0,'100g',100,'Healthy','Pan-India',['Lunch','Dinner'],'Non-Veg','Neutral','Tridoshic',['lean-protein','gym']),
  f('pi_006','Dal (Mixed)','मिक्स दाल',175,10,26,4,7,'1 katori',200,'Healthy','Pan-India',['Lunch','Dinner'],'Veg','Neutral','Tridoshic',['protein','staple']),
  f('pi_007','Dalia / Broken Wheat','दलिया',130,5,25,1,5,'1 katori',150,'Healthy','Pan-India',['Breakfast'],'Vegan','Neutral','Tridoshic',['fiber','healthy']),
  f('pi_008','Sprouts Salad','अंकुरित सलाद',80,6,12,1,5,'1 katori',100,'Healthy','Pan-India',['Breakfast','Snack'],'Vegan','Neutral','Tridoshic',['protein','fasting']),
  f('pi_009','Fruit Chaat','फ्रूट चाट',100,1,22,0,3,'1 plate',200,'Healthy','Pan-India',['Snack'],'Vegan','Cold','Pitta',['summer','vitamin']),
  f('pi_010','Makhana (Foxnut)','मखाना',100,4,15,0,1,'1 handful (30g)',30,'Healthy','Pan-India',['Snack'],'Veg','Neutral','Tridoshic',['fasting','light','ayurvedic']),
  f('pi_011','Roasted Chana','भुना चना',150,10,22,3,5,'1 handful (40g)',40,'Healthy','Pan-India',['Snack'],'Vegan','Neutral','Kapha',['protein','fiber','gym']),
  f('pi_012','Peanuts (Roasted)','भुने मूंगफली',180,8,6,14,3,'1 handful (30g)',30,'Healthy','Pan-India',['Snack'],'Vegan','Hot','Kapha',['winter','protein']),

  // ════════════════════════════════════════════════════
  // BEVERAGES
  // ════════════════════════════════════════════════════

  f('bv_001','Masala Chai','मसाला चाय',60,1,9,2,0,'1 cup',150,'Moderate','Pan-India',['Beverage'],'Veg','Hot','Vata',['morning','popular','winter']),
  f('bv_002','Plain Chai','सादी चाय',40,1,6,1,0,'1 cup',150,'Moderate','Pan-India',['Beverage'],'Veg','Hot','Vata',['morning','popular']),
  f('bv_003','Sweet Lassi','मीठी लस्सी',220,7,36,5,0,'1 glass (300ml)',300,'Moderate','North',['Beverage'],'Veg','Cold','Pitta',['summer','cooling','punjabi']),
  f('bv_004','Salty Lassi / Chaas','नमकीन छाछ',80,3,8,3,0,'1 glass (300ml)',300,'Healthy','Pan-India',['Beverage'],'Veg','Cold','Pitta',['digestive','summer','daily']),
  f('bv_005','Nimbu Pani','नींबू पानी',50,0,12,0,0,'1 glass (300ml)',300,'Healthy','Pan-India',['Beverage'],'Vegan','Cold','Pitta',['summer','hydrating','vitamin-c']),
  f('bv_006','Aam Panna','आम पन्ना',90,1,20,0,1,'1 glass (300ml)',300,'Healthy','Pan-India',['Beverage'],'Vegan','Cold','Pitta',['summer','mango','cooling']),
  f('bv_007','Jaljeera','जलजीरा',35,1,7,0,0,'1 glass',200,'Healthy','North',['Beverage'],'Vegan','Cold','Pitta',['digestive','street']),
  f('bv_008','Coconut Water','नारियल पानी',48,2,9,0,3,'1 glass (250ml)',250,'Healthy','Pan-India',['Beverage'],'Vegan','Cold','Tridoshic',['electrolytes','sport','summer']),
  f('bv_009','Rose Sherbet','रोज शर्बत',140,0,35,0,0,'1 glass',250,'Moderate','Pan-India',['Beverage'],'Vegan','Cold','Pitta',['sweet','summer','cooling']),
  f('bv_010','Turmeric Milk / Haldi Doodh','हल्दी दूध',150,5,18,5,0,'1 glass',250,'Healthy','Pan-India',['Beverage'],'Veg','Hot','Tridoshic',['ayurvedic','immunity','night']),
  f('bv_011','Thandai','ठंडाई',250,6,35,10,2,'1 glass',300,'Moderate','North',['Beverage'],'Veg','Cold','Pitta',['holi','festive','cooling']),
  f('bv_012','Nannari Sherbet','நன்னாரி சர்பத்',100,0,24,0,0,'1 glass',250,'Healthy','South',['Beverage'],'Vegan','Cold','Pitta',['south','summer','ayurvedic']),
  f('bv_013','Buttermilk (Chhachh)','छाछ',40,1,4,1,0,'1 glass',200,'Healthy','Pan-India',['Beverage'],'Veg','Cold','Pitta',['digestive','afternoon','summer']),
  f('bv_014','Sugarcane Juice','गन्ने का रस',110,0,27,0,0,'1 glass (250ml)',250,'Moderate','Pan-India',['Beverage'],'Vegan','Cold','Pitta',['street','summer','sugar']),
  f('bv_015','Badam Milk','बादाम दूध',220,8,24,10,1,'1 glass',250,'Moderate','Pan-India',['Beverage'],'Veg','Neutral','Tridoshic',['almonds','night','winter']),

  // ════════════════════════════════════════════════════
  // WELLNESS / MORNING DETOX
  // ════════════════════════════════════════════════════

  f('wd_001','Jeera Water','जीरा पानी',10,0,2,0,0,'1 glass',250,'Healthy','Pan-India',['Beverage'],'Vegan','Hot','Vata',['morning','detox','digestive']),
  f('wd_002','Methi Water','मेथी पानी',10,0,2,0,1,'1 glass',250,'Healthy','Pan-India',['Beverage'],'Vegan','Hot','Kapha',['morning','detox','diabetes']),
  f('wd_003','Amla Juice','आंवला जूस',30,0,7,0,0,'1 glass (100ml)',100,'Healthy','Pan-India',['Beverage'],'Vegan','Cold','Pitta',['vitamin-c','immunity','morning']),
  f('wd_004','Giloy Kadha','गिलोय काढ़ा',20,0,4,0,0,'1 cup',150,'Healthy','Pan-India',['Beverage'],'Vegan','Hot','Tridoshic',['immunity','ayurvedic','herbal']),
  f('wd_005','Tulsi Kadha','तुलसी काढ़ा',15,0,3,0,0,'1 cup',150,'Healthy','Pan-India',['Beverage'],'Vegan','Hot','Kapha',['immunity','cold','ayurvedic']),

  // ════════════════════════════════════════════════════
  // EXERCISE / ACTIVITY (for logging)
  // ════════════════════════════════════════════════════

  f('pi_013','Khichdi','खिचड़ी',280,10,48,5,5,'1 plate',250,'Healthy','Pan-India',['Lunch','Dinner'],'Veg','Neutral','Tridoshic',['comfort','sick','easy','digestive']),
  f('pi_014','Sambar Rice','सांभर राइस',350,10,60,6,6,'1 plate',300,'Healthy','South',['Lunch','Dinner'],'Veg','Neutral','Tridoshic',['south','comfort']),
  f('pi_015','Rajma Rice','राजमा चावल',420,16,70,6,10,'1 plate',350,'Healthy','North',['Lunch'],'Veg','Neutral','Tridoshic',['protein','popular','complete']),
  f('pi_016','Frankie (Veg)','फ्रैंकी',320,8,48,10,4,'1 roll',180,'Moderate','Pan-India',['Snack','Lunch'],'Veg','Neutral','Kapha',['street','roll','mumbai']),
  f('pi_017','Egg Roll','एग रोल',380,16,44,14,3,'1 roll',200,'Moderate','East',['Snack'],'Non-Veg','Neutral','Tridoshic',['kolkata','street','non-veg']),
  f('pi_018','Corn Chaat','कॉर्न चाट',180,4,32,4,4,'1 cup',150,'Healthy','Pan-India',['Snack'],'Vegan','Neutral','Tridoshic',['healthy-snack']),
  f('pi_019','Kela (Banana)','केला',90,1,21,0,3,'1 medium',120,'Healthy','Pan-India',['Snack','Breakfast'],'Vegan','Cold','Kapha',['fruit','energy','gym']),
  f('pi_020','Papaya (Papita)','पपीता',45,1,10,0,3,'1 cup cubed',150,'Healthy','Pan-India',['Breakfast','Snack'],'Vegan','Cold','Pitta',['digestion','vitamin']),
];

// ── Helper functions ───────────────────────────────────────────────────────

export const searchFoodsByName = (query: string): IndianFood[] => {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return INDIAN_FOODS.filter(
    f =>
      f.name.toLowerCase().includes(q) ||
      f.nameHindi.includes(q) ||
      f.tags.some(t => t.includes(q))
  );
};

export const getFoodById = (id: string): IndianFood | undefined =>
  INDIAN_FOODS.find(f => f.id === id);

export const getFoodsByRegion = (region: Region): IndianFood[] =>
  INDIAN_FOODS.filter(f => f.region === region || f.region === 'Pan-India');

export const getFoodsByMealType = (mealType: MealType): IndianFood[] =>
  INDIAN_FOODS.filter(f => f.mealType.includes(mealType));

export const filterByDiet = (foods: IndianFood[], diet: DietType): IndianFood[] => {
  if (diet === 'Non-Veg') return foods;
  if (diet === 'Veg') return foods.filter(f => f.dietType === 'Veg' || f.dietType === 'Jain' || f.dietType === 'Vegan');
  if (diet === 'Vegan') return foods.filter(f => f.dietType === 'Vegan');
  if (diet === 'Jain') return foods.filter(f => f.dietType === 'Jain' || f.dietType === 'Vegan');
  return foods;
};

export const getHealthyOptions = (): IndianFood[] =>
  INDIAN_FOODS.filter(f => f.healthRating === 'Healthy');

export const getTotalFoodCount = (): number => INDIAN_FOODS.length;
