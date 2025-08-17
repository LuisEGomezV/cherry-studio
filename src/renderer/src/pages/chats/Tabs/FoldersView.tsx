import React, { useState, useEffect, useRef } from 'react';
import { Tree, Dropdown, Menu } from 'antd';
import type { DataNode } from 'antd/es/tree';
import styled from 'styled-components';
import { isFolder } from '../data';
import { Folder, MessageSquare, XIcon } from 'lucide-react';
import { getDefaultTopic } from '@renderer/services/AssistantService';
import { Assistant, Topic } from '@renderer/types';
import { folderService, FolderWithChildren } from '@renderer/services/FolderService';
import { TopicManager } from '@renderer/hooks/useTopic';
import { DeleteIcon } from '@renderer/components/Icons';

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
  display: flex;
  justify-content: space-between;
  align-items: center;

  &:hover {
    background-color: var(--color-background-soft-hover);
  }
`;

const LOCAL_STORAGE_KEY = 'chats-folder-expanded-keys';

interface FoldersViewProps {
  addTopic: (topic: Topic) => void;
  removeTopic: (topic: Topic) => void;
  activeAssistant: Assistant;
}

const TopicItem = ({ topic, onSelect, onDelete, onRename }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState(topic.name);
  const deleteTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isConfirmingDelete) {
      onDelete(topic);
    } else {
      setIsConfirmingDelete(true);
      deleteTimerRef.current = setTimeout(() => {
        setIsConfirmingDelete(false);
      }, 2000);
    }
  };

  const handleRename = () => {
    if (editingName.trim() && editingName.trim() !== topic.name) {
      onRename(topic, editingName.trim());
    }
    setIsEditing(false);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditingName(topic.name);
    }
  };

  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) {
        clearTimeout(deleteTimerRef.current);
      }
    };
  }, []);

  return (
    <RootTopicItem
      onClick={onSelect}
      onDoubleClick={() => setIsEditing(true)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsConfirmingDelete(false);
        if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
      }}
    >
      {isEditing ? (
        <input
          type="text"
          value={editingName}
          onChange={(e) => setEditingName(e.target.value)}
          onKeyDown={handleEditKeyDown}
          onBlur={handleRename}
          autoFocus
          style={{ width: '100%', border: '1px solid var(--color-primary)', borderRadius: '4px' }}
        />
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <MessageSquare size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }}/>
            {topic.name}
          </div>
          {isHovered && (
            <button onClick={handleDeleteClick} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              {isConfirmingDelete ? <DeleteIcon size={14} /> : <XIcon size={14} />}
            </button>
          )}
        </>
      )}
    </RootTopicItem>
  );
}

const FoldersView: React.FC<FoldersViewProps> = ({ addTopic, removeTopic, activeAssistant }) => {
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [folders, setFolders] = useState<FolderWithChildren[]>([]);
  const [rootTopics, setRootTopics] = useState<Topic[]>([]);

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
      fetchData();
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

  const handleTopicRename = async (topic: Topic, newName: string) => {
    await TopicManager.updateTopic(topic.id, { name: newName });
    fetchData();
  };

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
          topic: item,
        };
      }
    });
  };

  const titleRenderer = (node: DataNode & { topic?: Topic }) => {
    if (node.isLeaf && node.topic) {
      return <TopicItem topic={node.topic} onSelect={() => onTopicClick(node.topic)} onDelete={() => { removeTopic(node.topic); fetchData(); }} onRename={handleTopicRename} />;
    }
    return (
      <Dropdown overlay={menu(node.key as string)} trigger={['contextMenu']}>
        <span>{node.title}</span>
      </Dropdown>
    );
  };

  const treeData = transformData(folders);

  const onSelect = (selectedKeys: React.Key[], info: any) => {
    if (info.node.isLeaf) {
      onTopicClick(info.node.topic);
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
            <TopicItem
              key={topic.id}
              topic={topic}
              onSelect={() => onTopicClick(topic)}
              onDelete={() => { removeTopic(topic); fetchData(); }}
              onRename={handleTopicRename}
            />
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
