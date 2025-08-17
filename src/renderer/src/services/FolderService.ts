import { db, Folder } from '@renderer/databases';
import { uuid } from '@renderer/utils';

class FolderService {
  async addFolder(name: string, parentId: string | null = null): Promise<Folder> {
    const newFolder: Folder = {
      id: uuid(),
      name,
      parentId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      order: 0, // Basic order for now
    };
    await db.folders.add(newFolder);
    return newFolder;
  }

  async getAllFolders(): Promise<Folder[]> {
    return db.folders.toArray();
  }

  async updateFolder(id: string, updates: Partial<Folder>): Promise<number> {
    return db.folders.update(id, { ...updates, updatedAt: Date.now() });
  }

  async deleteFolder(id: string): Promise<void> {
    // Note: This is a simple delete. A recursive delete will be needed later.
    return db.folders.delete(id);
  }
}

export const folderService = new FolderService();
