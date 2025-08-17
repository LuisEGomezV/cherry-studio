import React, { useState, useEffect } from 'react';
import { Tree, Dropdown, Menu } from 'antd';
import type { DataNode } from 'antd/es/tree';
import styled from 'styled-components';
import { isFolder } from '../data';
import { Folder, MessageSquare } from 'lucide-react';
import { getDefaultTopic } from '@renderer/services/AssistantService';
import { Assistant, Topic } from '@renderer/types';
import { folderService, FolderWithChildren } from '@renderer/services/FolderService';
import { TopicManager } from '@renderer/hooks/useTopic';
import TextEditPopup from '@renderer/components/Popups/TextEditPopup';

const FoldersViewContainer = styled.div`
  padding: 10px;
  height: 100%;
  overflow-y: auto;

  h4 {
    margin-top: 10px;
    margin-bottom: 8px;
    color: var(--color-text-secondary);
  }

  .ant-tree {
    background-color: transparent;
    color: var(--color-text);
  }

  .ant-tree .ant-tree-treenode {
    padding: 2px 0;
  }

  .ant-tree .ant-tree-node-content-wrapper:hover {
    background-color: var(--color-background-soft-hover);
  }

  .ant-tree .ant-tree-node-selected .ant-tree-node-content-wrapper {
    background-color: var(--color-background-soft-active);
  }
`;

const RootTopicList = styled.ul`
  list-style: none;
  padding-left: 4px;
`;

const RootTopicItem = styled.li`
  margin-bottom: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;

  &:hover {
    background-color: var(--color-background-soft-hover);
  }
`;

const LOCAL_STORAGE_KEY = 'chats-folder-expanded-keys';

interface FoldersViewProps {
  addTopic: (topic: Topic) => void;
  activeAssistant: Assistant;
}

const FoldersView: React.FC<FoldersViewProps> = ({ addTopic, activeAssistant }) => {
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [folders, setFolders] = useState<FolderWithChildren[]>([]);
  const [rootTopics, setRootTopics] = useState<Topic[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const fetchData = async () => {
    const { rootFolders, rootTopics } = await folderService.getFolderTree();
    setFolders(rootFolders);
    setRootTopics(rootTopics);
  };

  useEffect(() => {
    fetchData();
    const savedKeys = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedKeys) {
      setExpandedKeys(JSON.parse(savedKeys));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(expandedKeys));
  }, [expandedKeys]);

  const onExpand = (keys: React.Key[]) => {
    setExpandedKeys(keys);
  };

  const handleMenuClick = async (info: { key: string }, nodeId: string | null) => {
    if (info.key === 'new-topic') {
      const newTopic = getDefaultTopic(activeAssistant.id, nodeId);
      addTopic(newTopic);
    } else if (info.key === 'new-folder') {
      const allFolderNames = await folderService.getAllFolderNames();
      let n = 1;
      while (allFolderNames.includes(`Untitled ${n}`)) {
        n++;
      }
      await folderService.addFolder(`Untitled ${n}`, nodeId);
      fetchData();
    } else {
      console.log(`Action: ${info.key}, Folder ID: ${nodeId}`);
    }
  };

  const menu = (nodeId: string) => (
    <Menu onClick={(info) => handleMenuClick(info, nodeId)}>
      <Menu.Item key="new-folder">New Folder</Menu.Item>
      <Menu.Item key="new-topic">New Topic</Menu.Item>
      <Menu.Item key="rename">Rename</Menu.Item>
      <Menu.Item key="delete">Delete</Menu.Item>
    </Menu>
  );

  const transformData = (items: (FolderWithChildren | Topic)[]): DataNode[] => {
    return items.map(item => {
      if (isFolder(item)) {
        return {
          title: item.name,
          key: item.id,
          icon: <Folder size={16} />,
          children: item.children.length > 0 ? transformData(item.children) : [],
        };
      } else {
        return {
          title: item.name,
          key: item.id,
          icon: <MessageSquare size={16} />,
          isLeaf: true,
        };
      }
    });
  };

  const handleRename = async (id: string, isFolder: boolean) => {
    if (editingName.trim()) {
      if (isFolder) {
        await folderService.updateFolder(id, { name: editingName.trim() });
      } else {
        await TopicManager.updateTopic(id, { name: editingName.trim() });
      }
      fetchData();
    }
    setEditingId(null);
    setEditingName('');
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, id: string, isFolder: boolean) => {
    if (e.key === 'Enter') {
      handleRename(id, isFolder);
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditingName('');
    }
  };

  const titleRenderer = (node: DataNode) => {
    if (editingId === node.key) {
      return (
        <input
          type="text"
          value={editingName}
          onChange={(e) => setEditingName(e.target.value)}
          onKeyDown={(e) => handleEditKeyDown(e, node.key as string, !node.isLeaf)}
          onBlur={() => handleRename(node.key as string, !node.isLeaf)}
          autoFocus
        />
      );
    }
    if (node.isLeaf) {
      return <span>{node.title}</span>;
    }
    return (
      <Dropdown overlay={menu(node.key as string)} trigger={['contextMenu']}>
        <span onDoubleClick={() => { setEditingId(node.key as string); setEditingName(node.title as string); }}>{node.title}</span>
      </Dropdown>
    );
  };

  const treeData = transformData(folders);

  const onSelect = (selectedKeys: React.Key[], info: any) => {
    if (info.node.isLeaf) {
      console.log('Selected Topic:', info.node);
    }
  };

  const onTopicClick = (topic: Topic) => {
    console.log('Selected Root Topic:', topic);
  };

  return (
    <FoldersViewContainer>
      <div>
        <h4>Root Topics</h4>
        <RootTopicList>
          {rootTopics.map(topic => (
            <RootTopicItem key={topic.id} onClick={() => onTopicClick(topic)} onDoubleClick={() => { setEditingId(topic.id); setEditingName(topic.name); }}>
              {editingId === topic.id ? (
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => handleEditKeyDown(e, topic.id, false)}
                  onBlur={() => handleRename(topic.id, false)}
                  autoFocus
                />
              ) : (
                <>
                  <MessageSquare size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }}/>
                  {topic.name}
                </>
              )}
            </RootTopicItem>
          ))}
        </RootTopicList>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h4>Folders</h4>
        <button onClick={() => handleMenuClick({ key: 'new-folder' }, null)}>+</button>
      </div>
      <Tree
        showIcon
        onSelect={onSelect}
        treeData={treeData}
        expandedKeys={expandedKeys}
        onExpand={onExpand}
        titleRender={titleRenderer}
      />
    </FoldersViewContainer>
  );
};

export default FoldersView;
