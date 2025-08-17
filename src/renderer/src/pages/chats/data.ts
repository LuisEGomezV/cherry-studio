export interface Folder {
  id: string;
  name: string;
  children: (Folder | Topic)[];
  assistantId?: string;
}

export interface Topic {
  id: string;
  name: string;
  assistantId?: string;
}

export const isFolder = (item: Folder | Topic): item is Folder => {
  return 'children' in item;
};

export const fakeRootTopics: Topic[] = [
  { id: 'topic-root-1', name: 'Root Topic 1' },
  { id: 'topic-root-2', name: 'Another Root Topic' },
];

export const fakeFolders: Folder[] = [
  {
    id: 'folder-1',
    name: 'Work Projects',
    assistantId: 'asst-work-general',
    children: [
      {
        id: 'folder-1-1',
        name: 'Project Alpha',
        children: [
          { id: 'topic-1-1-1', name: 'Alpha - Initial Planning' },
          { id: 'topic-1-1-2', name: 'Alpha - Sprint 1' },
        ],
      },
      { id: 'topic-1-2', name: 'General Work Chat' },
    ],
  },
  {
    id: 'folder-2',
    name: 'Personal',
    children: [
      { id: 'topic-2-1', name: 'Vacation Planning' },
      { id: 'topic-2-2', name: 'Book Club' },
    ],
  },
  {
    id: 'folder-3',
    name: 'Empty Folder',
    children: [],
  },
];
