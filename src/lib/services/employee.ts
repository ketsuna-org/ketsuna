import pb from '$lib/pocketbase';
import type { Company, Employee } from '$lib/types';

const NAMES = [
    "Alex", "Jordan", "Taylor", "Morgan", "Casey", "Jamie", "Riley", "Avery", 
    "Quinn", "Skyler", "Charlie", "Sam", "Pat", "Drew", "Cameron", "Reese"
];

const ROLES = ["Ouvrier", "Technicien", "Ingénieur", "Analyste", "Chercheur"];

function getRandomElement<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomEmployee(companyId: string): Partial<Employee> {
    const rand = Math.random();
    let rarity = 0;
    let efficiencyBase = 50;
    let salaryBase = 100;

    if (rand > 0.99) { rarity = 3; efficiencyBase = 150; salaryBase = 1000; }
    else if (rand > 0.90) { rarity = 2; efficiencyBase = 110; salaryBase = 500; }
    else if (rand > 0.60) { rarity = 1; efficiencyBase = 80; salaryBase = 250; }
    else { rarity = 0; }

    // Random variance +/- 10%
    const efficiency = Math.floor(efficiencyBase * (0.9 + Math.random() * 0.2));
    const salary = Math.floor(salaryBase * (0.9 + Math.random() * 0.2));

    return {
        employer: companyId,
        name: `${getRandomElement(NAMES)} ${Math.floor(Math.random()*100)}`,
        rarity,
        efficiency,
        salary,
        poste: getRandomElement(ROLES)
    };
}

export async function hireRandomEmployee(company: Company): Promise<Employee> {
    // 1. Generate Stats
    const payload = generateRandomEmployee(company.id);
    
    // 2. Cost to hire? (Optional rule: Hiring costs money?)
    // Let's assume hiring fee is 5x daily salary
    const hiringFee = (payload.salary || 100) * 5;
    
    if (company.balance < hiringFee) {
        throw new Error(`Fonds insuffisants. Coût du recrutement : $${hiringFee}`);
    }

    // 3. Update Company Balance & Daily Payroll
    // Note: Concurrency safety would need backend logic, but we do client-side for now.
    await pb.collection('companies').update(company.id, {
        balance: company.balance - hiringFee,
        payroll_daily_cost: company.payroll_daily_cost + (payload.salary || 0)
    });

    // 4. Create Employee
    const record = await pb.collection('employees').create<Employee>(payload);
    
    return record;
}
