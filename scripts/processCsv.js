const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '../Indian_Food_Nutrition_Processed.csv');
const outputPath = path.join(__dirname, '../data/indianFoodsDatabase.ts');

const content = fs.readFileSync(csvPath, 'utf8');
const lines = content.split('\n').filter(line => line.trim() !== '');
const headers = lines[0].split(',');

// Skip header
const data = lines.slice(1).map((line, index) => {
    // Basic CSV parser to handle potential commas in quotes (though this CSV looks simple)
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let char of line) {
        if (char === '"') inQuotes = !inQuotes;
        else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    values.push(current.trim());

    return {
        id: `csv_${index}`,
        name: values[0],
        calories: parseFloat(values[1]) || 0,
        carbs: parseFloat(values[2]) || 0,
        protein: parseFloat(values[3]) || 0,
        fat: parseFloat(values[4]) || 0,
        fiber: parseFloat(values[6]) || 0,
        servingSize: '1 serving',
        isVerified: true
    };
});

const tsFileContent = `
export interface LocalIndianFood {
    id: string;
    name: string;
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
    fiber: number;
    servingSize: string;
    isVerified: boolean;
}

export const INDIAN_CSV_DATA: LocalIndianFood[] = ${JSON.stringify(data, null, 2)};
`;

fs.writeFileSync(outputPath, tsFileContent);
console.log('Successfully processed CSV to data/indianFoodsDatabase.ts');
