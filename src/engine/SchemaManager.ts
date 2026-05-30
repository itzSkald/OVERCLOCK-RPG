import { supabase } from '../lib/supabase';
import type { TableSchema, ColumnDef, IndexDef, RLSPolicy, IPlugin } from './types';

/**
 * SchemaManager handles automatic table creation on engine boot.
 * Plugins can define their own schemas and the manager ensures all tables exist.
 */
export class SchemaManager {
  private schemas: TableSchema[] = [];
  private initialized = false;

  /**
   * Register a table schema. Call this before engine boot.
   */
  register(schema: TableSchema): void {
    if (!this.schemas.find(s => s.name === schema.name)) {
      this.schemas.push(schema);
    }
  }

  /**
   * Register all schemas from a plugin's schema property.
   */
  registerPluginSchemas(plugin: IPlugin): void {
    if (plugin.schema) {
      for (const schema of plugin.schema) {
        this.register(schema);
      }
    }
  }

  /**
   * Check if a table exists in the database.
   */
  private async tableExists(tableName: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(0);
      
      // If no error, table exists
      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Build CREATE TABLE SQL from schema definition.
   */
  private buildCreateTableSQL(schema: TableSchema): string {
    const columnDefs = schema.columns.map(col => {
      let def = `"${col.name}" ${col.type}`;
      
      if (col.primaryKey) {
        def += ' PRIMARY KEY';
      }
      if (col.default) {
        def += ` DEFAULT ${col.default}`;
      }
      if (!col.nullable && !col.primaryKey) {
        def += ' NOT NULL';
      }
      if (col.unique) {
        def += ' UNIQUE';
      }
      if (col.references) {
        def += ` REFERENCES ${col.references.table}(${col.references.column})`;
        if (col.references.onDelete) {
          def += ` ON DELETE ${col.references.onDelete}`;
        }
      }
      if (col.check) {
        def += ` CHECK (${col.check})`;
      }
      
      return def;
    });

    return `CREATE TABLE IF NOT EXISTS public."${schema.name}" (\n  ${columnDefs.join(',\n  ')}\n);`;
  }

  /**
   * Build index creation SQL.
   */
  private buildIndexSQL(tableName: string, index: IndexDef): string {
    const unique = index.unique ? 'UNIQUE ' : '';
    const cols = index.columns.map(c => `"${c}"`).join(', ');
    return `CREATE ${unique}INDEX IF NOT EXISTS "${index.name}" ON public."${tableName}"(${cols});`;
  }

  /**
   * Build RLS policy SQL.
   */
  private buildRLSSQL(tableName: string, policy: RLSPolicy): string {
    const statements: string[] = [];
    
    // Enable RLS
    statements.push(`ALTER TABLE public."${tableName}" ENABLE ROW LEVEL SECURITY;`);
    
    // Drop existing policy if exists
    statements.push(`DROP POLICY IF EXISTS "${policy.name}" ON public."${tableName}";`);
    
    // Create policy
    let policySQL = `CREATE POLICY "${policy.name}" ON public."${tableName}"`;
    policySQL += ` FOR ${policy.operation}`;
    
    if (policy.using) {
      policySQL += ` USING (${policy.using})`;
    }
    if (policy.withCheck) {
      policySQL += ` WITH CHECK (${policy.withCheck})`;
    }
    
    statements.push(policySQL + ';');
    
    return statements.join('\n');
  }

  /**
   * Initialize all registered schemas - create tables if they don't exist.
   * Returns a log of actions taken.
   */
  async ensureSchemas(): Promise<string[]> {
    if (this.initialized) {
      return ['Schema already initialized'];
    }

    const log: string[] = [];
    
    for (const schema of this.schemas) {
      const exists = await this.tableExists(schema.name);
      
      if (exists) {
        log.push(`Table "${schema.name}" exists`);
        continue;
      }

      log.push(`Creating table "${schema.name}"...`);
      
      try {
        // Create table
        const createSQL = this.buildCreateTableSQL(schema);
        const { error: createError } = await supabase.rpc('exec_sql', { sql: createSQL });
        
        if (createError) {
          // Try alternative: direct query (may not work depending on permissions)
          log.push(`  Warning: Could not create via RPC: ${createError.message}`);
          log.push(`  Table "${schema.name}" may need manual creation`);
          continue;
        }

        log.push(`  Table "${schema.name}" created`);

        // Create indexes
        if (schema.indexes) {
          for (const index of schema.indexes) {
            const indexSQL = this.buildIndexSQL(schema.name, index);
            await supabase.rpc('exec_sql', { sql: indexSQL });
            log.push(`  Index "${index.name}" created`);
          }
        }

        // Apply RLS policies
        if (schema.rls) {
          for (const policy of schema.rls) {
            const rlsSQL = this.buildRLSSQL(schema.name, policy);
            await supabase.rpc('exec_sql', { sql: rlsSQL });
            log.push(`  RLS policy "${policy.name}" applied`);
          }
        }

      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.push(`  Error creating "${schema.name}": ${msg}`);
      }
    }

    this.initialized = true;
    return log;
  }

  /**
   * Get all registered schemas (for debugging/export).
   */
  getSchemas(): TableSchema[] {
    return [...this.schemas];
  }

  /**
   * Export all schemas as a single SQL migration file.
   */
  exportMigrationSQL(): string {
    const parts: string[] = [
      '-- Auto-generated OVERCLOCK schema migration',
      `-- Generated: ${new Date().toISOString()}`,
      '',
    ];

    for (const schema of this.schemas) {
      parts.push(`-- Table: ${schema.name}`);
      parts.push(this.buildCreateTableSQL(schema));
      parts.push('');

      if (schema.indexes) {
        for (const index of schema.indexes) {
          parts.push(this.buildIndexSQL(schema.name, index));
        }
        parts.push('');
      }

      if (schema.rls) {
        for (const policy of schema.rls) {
          parts.push(this.buildRLSSQL(schema.name, policy));
        }
        parts.push('');
      }
    }

    return parts.join('\n');
  }
}

// Singleton instance
export const schemaManager = new SchemaManager();
