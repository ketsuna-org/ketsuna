export const mission = {
	eyebrow: 'Ketsuna · la ruche',
	headline: 'Des outils ouverts qui rendent aux communautés la maîtrise de leur vie numérique.',
	statement:
		'Ketsuna est une ruche de projets indépendants, construits en public, qui remettent les bots, les données, le stockage et le jeu entre les mains de celles et ceux qui les utilisent.',
	principles: [
		{
			title: 'Posséder sa pile',
			text: 'Vos bots, vos données et votre stockage vous appartiennent. Nos outils se déploient chez vous et restent sous votre contrôle.'
		},
		{
			title: 'Construire en public',
			text: 'Le code, la feuille de route et les décisions sont ouverts. On avance avec la communauté, pas derrière elle.'
		},
		{
			title: 'De petites cellules, une ruche solide',
			text: 'Chaque projet est autonome et utile seul. Ensemble, ils forment un écosystème qui se renforce.'
		}
	]
};

export type Cell = {
	name: string;
	tag: string;
	status: string;
	description: string;
	href: string;
	cta: string;
};

export const cells: Cell[] = [
	{
		name: 'Bot-Creator',
		tag: 'Bots Discord',
		status: 'Actif',
		description:
			'Créez, personnalisez et hébergez vos bots Discord sans écrire de code complexe : commandes, actions et workflows depuis un éditeur visuel, sur mobile, web et desktop.',
		href: 'https://bot-creator.fr',
		cta: 'Visiter bot-creator.fr'
	},
	{
		name: 'Sovrabase',
		tag: 'Données',
		status: 'Open source',
		description:
			'Une base de données et un backend que vous hébergez vous-même, pour garder la souveraineté sur vos données.',
		href: 'https://github.com/sovrabase/sovrabase',
		cta: 'Voir sur GitHub'
	},
	{
		name: 'KexaManager',
		tag: 'Stockage',
		status: 'Open source',
		description:
			'Un gestionnaire pour administrer votre stockage objet auto-hébergé depuis une interface simple.',
		href: 'https://github.com/ketsuna-org/kexamanager',
		cta: 'Voir sur GitHub'
	},
	{
		name: 'Chessy',
		tag: 'Jeu',
		status: 'En ligne',
		description: 'Jouez aux échecs en ligne, simplement et sans friction.',
		href: 'https://chess.ketsuna.com',
		cta: 'Jouer sur chess.ketsuna.com'
	}
];

export const links = [
	{ label: 'Discord', href: 'https://discord.gg/gyEGNBUZdA' },
	{ label: 'GitHub', href: 'https://github.com/ketsuna-org' },
	{ label: 'Bot-Creator', href: 'https://bot-creator.fr' }
];
