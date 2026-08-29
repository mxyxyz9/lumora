export interface AsanaTask {
  gid: string;
  name: string;
  notes?: string;
  completed: boolean;
  assignee?: { gid: string; name: string };
  permalink_url: string;
}

export class AsanaSyncEngine {
  private formatHeader(pat: string) {
    return {
      'Authorization': `Bearer ${pat.trim()}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
  }

  async testConnection(pat: string): Promise<{ ok: boolean; message: string; user?: any }> {
    try {
      const res = await fetch('https://app.asana.com/api/1.0/users/me', {
        headers: this.formatHeader(pat),
      });

      if (!res.ok) {
        return { ok: false, message: `Asana auth failed: HTTP ${res.status}` };
      }

      const json = await res.json();
      const user = json.data;
      return { ok: true, message: `Connected as ${user.name} (${user.email})`, user };
    } catch (e: any) {
      return { ok: false, message: e.message || 'Asana network error' };
    }
  }

  async fetchWorkspaces(pat: string): Promise<Array<{ gid: string; name: string }>> {
    const res = await fetch('https://app.asana.com/api/1.0/workspaces', {
      headers: this.formatHeader(pat),
    });

    if (!res.ok) throw new Error('Failed to fetch Asana workspaces');
    const json = await res.json();
    return json.data || [];
  }

  async fetchProjects(pat: string, workspaceGid: string): Promise<Array<{ gid: string; name: string }>> {
    const res = await fetch(`https://app.asana.com/api/1.0/projects?workspace=${workspaceGid}`, {
      headers: this.formatHeader(pat),
    });

    if (!res.ok) throw new Error('Failed to fetch Asana projects');
    const json = await res.json();
    return json.data || [];
  }

  async fetchTasks(pat: string, projectGid: string): Promise<AsanaTask[]> {
    const res = await fetch(`https://app.asana.com/api/1.0/projects/${projectGid}/tasks?opt_fields=name,notes,completed,assignee.name,permalink_url`, {
      headers: this.formatHeader(pat),
    });

    if (!res.ok) throw new Error('Failed to fetch Asana tasks');
    const json = await res.json();
    return json.data || [];
  }

  async createTask(pat: string, projectGid: string, name: string, notes?: string): Promise<AsanaTask> {
    const res = await fetch('https://app.asana.com/api/1.0/tasks', {
      method: 'POST',
      headers: this.formatHeader(pat),
      body: JSON.stringify({
        data: {
          projects: [projectGid],
          name,
          notes: notes || '',
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`Failed to create Asana task: HTTP ${res.status}`);
    }

    const json = await res.json();
    return json.data;
  }

  async postComment(pat: string, taskGid: string, text: string): Promise<boolean> {
    const res = await fetch(`https://app.asana.com/api/1.0/tasks/${taskGid}/stories`, {
      method: 'POST',
      headers: this.formatHeader(pat),
      body: JSON.stringify({
        data: {
          text,
        },
      }),
    });

    return res.ok;
  }
}

export const asanaSync = new AsanaSyncEngine();
