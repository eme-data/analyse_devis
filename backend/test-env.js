import dotenv from 'dotenv';

// Charger le .env depuis le répertoire parent
dotenv.config({ path: '../.env' });

console.log('🔍 Vérification des variables d\'environnement:\n');
console.log('GEMINI_API_KEY présente:', !!process.env.GEMINI_API_KEY);
console.log('GEMINI_API_KEY longueur:', process.env.GEMINI_API_KEY?.length || 0);
console.log('GEMINI_API_KEY commence par:', process.env.GEMINI_API_KEY?.substring(0, 12));
console.log('GEMINI_API_KEY finit par:', process.env.GEMINI_API_KEY?.substring(process.env.GEMINI_API_KEY.length - 6));
console.log('\nNODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
