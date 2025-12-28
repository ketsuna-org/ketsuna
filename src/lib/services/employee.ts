import pb from '$lib/pocketbase';
import type { Company, Employee } from '$lib/types';

export async function hireRandomEmployee(company: Company): Promise<Employee> {
    // Le frontend envoie juste la demande avec l'ID de la compagnie
    // Tout le reste (rareté, efficacité, salaire, poste, nom) est généré côté serveur
    const payload = {
        employer: company.id
    };

    try {
        const record = await pb.collection('employees').create<Employee>(payload);
        return record;
    } catch (error: any) {
        // L'erreur vient du hook si la balance est insuffisante
        throw new Error(error.message || "Erreur lors du recrutement");
    }
}
