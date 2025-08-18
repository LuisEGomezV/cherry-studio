export interface FolderItem {
  id: string;
  name: string;
  type: 'folder' | 'file' | 'chat';
  children?: FolderItem[];
  isOpen?: boolean;
  icon?: string;
  lastModified?: Date;
  created?: Date;
}

export interface FolderTreeProps {
  data: FolderItem[];
  onSelect?: (item: FolderItem) => void;
  selectedId?: string;
  level?: number;
}
