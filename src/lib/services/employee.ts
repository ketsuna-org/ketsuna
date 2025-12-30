import pb from '$lib/pocketbase';
import type { Company, Employee } from '$lib/types';

export interface BulkHireResult {
    success: boolean;
    message: string;
    records: Employee[];
    totalCost: number;
    hiredCount: number;
    errors: string[];
}

export interface HireCostPreview {
    averageHiringFee: number;
    averageReserveNeeded: number;
    averageTotalRequired: number;
    maxBulkHire: number;
    description: string;
}

/**
 * Embauche un ou plusieurs employés aléatoires
 */
export async function hireRandomEmployee(company: Company, quantity: number = 1): Promise<BulkHireResult> {
    const payload = {
        companyId: company.id,
        quantity: quantity
    };

    try {
        const response: any = await pb.send('/api/employees/hire', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        // Handle both old format (record) and new format (records)
        if (response.records && Array.isArray(response.records)) {
            // New bulk format
            return response as BulkHireResult;
        } else if (response.record) {
            // Old single record format - convert to bulk format
            return {
                success: response.success,
                message: response.message || "Employé recruté avec succès",
                records: [response.record],
                totalCost: response.cost || 0,
                hiredCount: 1,
                errors: []
            };
        } else {
            throw new Error("Format de réponse invalide");
        }
    } catch (error: any) {
        let msg = error.message || "Erreur lors du recrutement";
        if (error.data && error.data.message) {
            msg = error.data.message;
        }
        throw new Error(msg);
    }
}

/**
 * Récupère une estimation des coûts de recrutement
 */
export async function getHireCostPreview(): Promise<HireCostPreview> {
    try {
        const response = await pb.send('/api/employees/preview-cost', {
            method: 'GET'
        }) as HireCostPreview;
        return response;
    } catch (error: any) {
        // Fallback values if endpoint fails
        return {
            averageHiringFee: 221,
            averageReserveNeeded: 1326,
            averageTotalRequired: 1547,
            maxBulkHire: 50,
            description: "Coût moyen estimé"
        };
    }
}
