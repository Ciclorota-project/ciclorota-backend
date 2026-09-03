import { supabaseAdmin } from '../config/supabase.js';

export interface AppSettings {
  geofence_disabled: boolean;
}

export class SettingsService {
  async getSettings(): Promise<AppSettings> {
    const { data, error } = await supabaseAdmin
      .from('app_settings')
      .select('geofence_disabled')
      .eq('id', true)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar configurações do app: ${error.message}`);
    }

    // A migração já popula a linha singleton; se por algum motivo faltar,
    // assume o padrão seguro (geofence ligado) em vez de quebrar a request.
    return { geofence_disabled: data?.geofence_disabled ?? false };
  }

  async updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
    if (patch.geofence_disabled === undefined) {
      return this.getSettings();
    }

    const { data, error } = await supabaseAdmin
      .from('app_settings')
      .update({ geofence_disabled: patch.geofence_disabled })
      .eq('id', true)
      .select('geofence_disabled')
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar configurações do app: ${error.message}`);
    }

    return { geofence_disabled: data.geofence_disabled };
  }
}
