import { supabaseAdmin } from '../config/supabase.js';

export class ProgressService {
  async getUserProgress(userId: string) {
    const { data, error } = await supabaseAdmin
      .from('checkins')
      .select(`
        id,
        scanned_at,
        checkpoints (
          id,
          name,
          description
        )
      `)
      .eq('user_id', userId)
      .order('scanned_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }
}
