import pb from '$lib/pocketbase';
import type { Company, Employee } from '$lib/types';

export async function hireRandomEmployee(company: Company): Promise<Employee> {
    // Le frontend envoie juste la demande avec l'ID de la compagnie
    // Tout le reste (rareté, efficacité, salaire, poste, nom) est généré côté serveur
    const payload = {
        companyId: company.id
    };

    try {
        // Use custom endpoint
        const response: any = await pb.send('/api/employees/hire', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        return response.record;
    } catch (error: any) {
        // Capture specific error message from server
        // The error object from pb.send often contains data about the response
        let msg = error.message || "Erreur lors du recrutement";
        if (error.data && error.data.message) {
            msg = error.data.message;
        }
        throw new Error(msg);
    }
}
