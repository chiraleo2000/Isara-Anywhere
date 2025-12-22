export interface Drug {
  id: string;
  name: string;
  genericName: string;
  brandNames: string[];
  category: string;
  indications: string[];
  contraindications: string[];
  sideEffects: string[];
  dosageForm: string[];
  commonDosages: string[];
  route: string[];
  interactions: string[];
}

export const drugDatabase: Drug[] = [
  {
    id: 'drug_001',
    name: 'Amoxicillin',
    genericName: 'Amoxicillin',
    brandNames: ['Amoxil', 'Trimox'],
    category: 'Antibiotic',
    indications: ['Bacterial infections', 'Respiratory infections', 'Skin infections'],
    contraindications: ['Penicillin allergy', 'Mononucleosis'],
    sideEffects: ['Nausea', 'Diarrhea', 'Rash', 'Allergic reactions'],
    dosageForm: ['Capsule', 'Tablet', 'Oral suspension'],
    commonDosages: ['250mg', '500mg', '875mg'],
    route: ['Oral'],
    interactions: ['Methotrexate', 'Oral contraceptives', 'Warfarin'],
  },
  {
    id: 'drug_002',
    name: 'Metformin',
    genericName: 'Metformin',
    brandNames: ['Glucophage', 'Fortamet'],
    category: 'Antidiabetic',
    indications: ['Type 2 diabetes', 'Prediabetes', 'PCOS'],
    contraindications: ['Severe renal impairment', 'Metabolic acidosis', 'Heart failure'],
    sideEffects: ['Nausea', 'Diarrhea', 'Abdominal pain', 'Metallic taste'],
    dosageForm: ['Tablet', 'Extended-release tablet'],
    commonDosages: ['500mg', '850mg', '1000mg'],
    route: ['Oral'],
    interactions: ['Iodinated contrast', 'Alcohol', 'Cimetidine'],
  },
  {
    id: 'drug_003',
    name: 'Lisinopril',
    genericName: 'Lisinopril',
    brandNames: ['Prinivil', 'Zestril'],
    category: 'ACE Inhibitor',
    indications: ['Hypertension', 'Heart failure', 'Post-MI'],
    contraindications: ['Pregnancy', 'Angioedema history', 'Bilateral renal artery stenosis'],
    sideEffects: ['Dry cough', 'Dizziness', 'Hyperkalemia', 'Hypotension'],
    dosageForm: ['Tablet'],
    commonDosages: ['5mg', '10mg', '20mg', '40mg'],
    route: ['Oral'],
    interactions: ['NSAIDs', 'Potassium supplements', 'Lithium'],
  },
  {
    id: 'drug_004',
    name: 'Atorvastatin',
    genericName: 'Atorvastatin',
    brandNames: ['Lipitor'],
    category: 'Statin',
    indications: ['Hyperlipidemia', 'Cardiovascular disease prevention'],
    contraindications: ['Active liver disease', 'Pregnancy', 'Breastfeeding'],
    sideEffects: ['Muscle pain', 'Elevated liver enzymes', 'Headache'],
    dosageForm: ['Tablet'],
    commonDosages: ['10mg', '20mg', '40mg', '80mg'],
    route: ['Oral'],
    interactions: ['Cyclosporine', 'Gemfibrozil', 'Grapefruit juice'],
  },
  {
    id: 'drug_005',
    name: 'Omeprazole',
    genericName: 'Omeprazole',
    brandNames: ['Prilosec', 'Losec'],
    category: 'Proton Pump Inhibitor',
    indications: ['GERD', 'Peptic ulcer', 'Zollinger-Ellison syndrome'],
    contraindications: ['Hypersensitivity to PPIs'],
    sideEffects: ['Headache', 'Nausea', 'Diarrhea', 'Abdominal pain'],
    dosageForm: ['Capsule', 'Tablet'],
    commonDosages: ['20mg', '40mg'],
    route: ['Oral'],
    interactions: ['Clopidogrel', 'Warfarin', 'Methotrexate'],
  },
  {
    id: 'drug_006',
    name: 'Paracetamol',
    genericName: 'Acetaminophen',
    brandNames: ['Tylenol', 'Panadol'],
    category: 'Analgesic/Antipyretic',
    indications: ['Pain', 'Fever', 'Headache'],
    contraindications: ['Severe liver disease', 'Acetaminophen allergy'],
    sideEffects: ['Rare: Liver damage with overdose', 'Rash'],
    dosageForm: ['Tablet', 'Capsule', 'Liquid', 'Suppository'],
    commonDosages: ['325mg', '500mg', '650mg'],
    route: ['Oral', 'Rectal'],
    interactions: ['Warfarin', 'Isoniazid', 'Alcohol'],
  },
  {
    id: 'drug_007',
    name: 'Ibuprofen',
    genericName: 'Ibuprofen',
    brandNames: ['Advil', 'Motrin'],
    category: 'NSAID',
    indications: ['Pain', 'Inflammation', 'Fever'],
    contraindications: ['Peptic ulcer', 'Severe heart failure', 'Third trimester pregnancy'],
    sideEffects: ['GI upset', 'Bleeding', 'Renal impairment', 'Cardiovascular events'],
    dosageForm: ['Tablet', 'Capsule', 'Liquid'],
    commonDosages: ['200mg', '400mg', '600mg', '800mg'],
    route: ['Oral'],
    interactions: ['Aspirin', 'Warfarin', 'ACE inhibitors', 'Lithium'],
  },
  {
    id: 'drug_008',
    name: 'Amlodipine',
    genericName: 'Amlodipine',
    brandNames: ['Norvasc'],
    category: 'Calcium Channel Blocker',
    indications: ['Hypertension', 'Angina'],
    contraindications: ['Severe hypotension', 'Cardiogenic shock'],
    sideEffects: ['Peripheral edema', 'Dizziness', 'Flushing', 'Headache'],
    dosageForm: ['Tablet'],
    commonDosages: ['2.5mg', '5mg', '10mg'],
    route: ['Oral'],
    interactions: ['Simvastatin', 'CYP3A4 inhibitors'],
  },
  {
    id: 'drug_009',
    name: 'Levothyroxine',
    genericName: 'Levothyroxine',
    brandNames: ['Synthroid', 'Levoxyl'],
    category: 'Thyroid Hormone',
    indications: ['Hypothyroidism', 'Thyroid cancer'],
    contraindications: ['Uncorrected adrenal insufficiency', 'Thyrotoxicosis'],
    sideEffects: ['Weight loss', 'Tremor', 'Palpitations', 'Insomnia'],
    dosageForm: ['Tablet'],
    commonDosages: ['25mcg', '50mcg', '75mcg', '100mcg', '125mcg'],
    route: ['Oral'],
    interactions: ['Iron supplements', 'Calcium', 'PPIs', 'Warfarin'],
  },
  {
    id: 'drug_010',
    name: 'Azithromycin',
    genericName: 'Azithromycin',
    brandNames: ['Zithromax', 'Z-Pak'],
    category: 'Macrolide Antibiotic',
    indications: ['Respiratory infections', 'Skin infections', 'STIs'],
    contraindications: ['Macrolide allergy', 'History of cholestatic jaundice'],
    sideEffects: ['Nausea', 'Diarrhea', 'Abdominal pain', 'QT prolongation'],
    dosageForm: ['Tablet', 'Capsule', 'Suspension'],
    commonDosages: ['250mg', '500mg'],
    route: ['Oral'],
    interactions: ['Warfarin', 'Digoxin', 'QT-prolonging drugs'],
  },
];

export const searchDrugs = (query: string): Drug[] => {
  const lowerQuery = query.toLowerCase();
  return drugDatabase.filter(
    drug =>
      drug.name.toLowerCase().includes(lowerQuery) ||
      drug.genericName.toLowerCase().includes(lowerQuery) ||
      drug.brandNames.some(brand => brand.toLowerCase().includes(lowerQuery))
  );
};

export const getDrugById = (id: string): Drug | undefined => {
  return drugDatabase.find(drug => drug.id === id);
};

export const checkDrugInteractions = (drugIds: string[]): any[] => {
  const drugs = drugIds.map(id => getDrugById(id)).filter(Boolean) as Drug[];
  const interactions: any[] = [];

  for (let i = 0; i < drugs.length; i++) {
    for (let j = i + 1; j < drugs.length; j++) {
      const drug1 = drugs[i];
      const drug2 = drugs[j];

      const hasInteraction =
        drug1.interactions.some(int => drug2.name.toLowerCase().includes(int.toLowerCase())) ||
        drug2.interactions.some(int => drug1.name.toLowerCase().includes(int.toLowerCase()));

      if (hasInteraction) {
        interactions.push({
          drug1: drug1.name,
          drug2: drug2.name,
          severity: 'moderate',
          description: `Potential interaction between ${drug1.name} and ${drug2.name}`,
          recommendation: 'Monitor patient closely',
        });
      }
    }
  }

  return interactions;
};

export default drugDatabase;
