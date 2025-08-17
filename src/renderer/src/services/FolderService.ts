import { db, Folder } from '@renderer/databases';
import { uuid } from '@renderer/utils';
import { Topic } from '@renderer/types';

export interface FolderWithChildren extends Folder {
  children: (FolderWithChildren | Topic)[];
}

class FolderService {
  async getFolderTree(): Promise<{ rootFolders: FolderWithChildren[], rootTopics: Topic[] }> {
    const allFolders = await db.folders.toArray();
    const allTopics = await db.topics.toArray();

    const folderMap = new Map<string, FolderWithChildren>();
    allFolders.forEach(f => folderMap.set(f.id, { ...f, children: [] }));

    const rootFolders: FolderWithChildren[] = [];
    const rootTopics: Topic[] = allTopics.filter(t => !t.folderId);

    allFolders.forEach(folder => {
      if (folder.parentId && folderMap.has(folder.parentId)) {
        folderMap.get(folder.parentId)!.children.push(folderMap.get(folder.id)!);
      } else {
        rootFolders.push(folderMap.get(folder.id)!);
      }
    });

    allTopics.forEach(topic => {
      if (topic.folderId && folderMap.has(topic.folderId)) {
        folderMap.get(topic.folderId)!.children.push(topic as any);
      }
    });

    return { rootFolders, rootTopics };
  }

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

  async getAllFolderNames(): Promise<string[]> {
    const allFolders = await db.folders.toArray();
    return allFolders.map(f => f.name);
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
