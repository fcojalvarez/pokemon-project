import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_BASE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_BASE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error(
        'Faltan las variables VITE_BASE_SUPABASE_URL y/o VITE_BASE_SUPABASE_KEY. ' +
        'Copia .env.example a .env y rellena las credenciales de Supabase.'
    );
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseKey);
