import { FolderItem } from '../types/folder';

export const mockFolders: FolderItem[] = [
  {
    id: '1',
    name: 'Personal',
    type: 'folder',
    isOpen: true,
    icon: 'folder',
    children: [
      {
        id: '1-1',
        name: 'Project Ideas',
        type: 'folder',
        icon: 'folder',
        children: [
          {
            id: '1-1-1',
            name: 'AI Assistant',
            type: 'chat',
            icon: 'message-square',
            lastModified: new Date('2023-10-15'),
          },
          {
            id: '1-1-2',
            name: 'Mobile App',
            type: 'chat',
            icon: 'message-square',
            lastModified: new Date('2023-10-10'),
          },
        ],
      },
      {
        id: '1-2',
        name: 'Research',
        type: 'folder',
        icon: 'folder',
        children: [
          {
            id: '1-2-1',
            name: 'LLM Comparison',
            type: 'chat',
            icon: 'message-square',
            lastModified: new Date('2023-10-05'),
          },
        ],
      },
    ],
  },
  {
    id: '2',
    name: 'Work',
    type: 'folder',
    icon: 'folder',
    children: [
      {
        id: '2-1',
        name: 'Q4 Planning',
        type: 'chat',
        icon: 'message-square',
        lastModified: new Date('2023-09-28'),
      },
      {
        id: '2-2',
        name: 'Team Updates',
        type: 'folder',
        icon: 'folder',
        children: [
          {
            id: '2-2-1',
            name: 'Weekly Sync',
            type: 'chat',
            icon: 'message-square',
            lastModified: new Date('2023-10-16'),
          },
        ],
      },
    ],
  },
  {
    id: '3',
    name: 'Archive',
    type: 'folder',
    icon: 'archive',
    isOpen: false,
    children: [],
  },
];
