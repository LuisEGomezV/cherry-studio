import React, { useState, useEffect } from 'react';
import { Tree, Dropdown, Menu } from 'antd';
import type { DataNode } from 'antd/es/tree';
import styled from 'styled-components';
import { Folder as FolderType, Topic, isFolder, fakeFolders, fakeRootTopics } from '../data';
import { Folder, MessageSquare } from 'lucide-react';

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

const FoldersView: React.FC = () => {
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);

  useEffect(() => {
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

  const handleMenuClick = (info: { key: string }, nodeId: string) => {
    console.log(`Action: ${info.key}, Folder ID: ${nodeId}`);
  };

  const menu = (nodeId: string) => (
    <Menu onClick={(info) => handleMenuClick(info, nodeId)}>
      <Menu.Item key="new-folder">New Folder</Menu.Item>
      <Menu.Item key="new-topic">New Topic</Menu.Item>
      <Menu.Item key="rename">Rename</Menu.Item>
      <Menu.Item key="delete">Delete</Menu.Item>
    </Menu>
  );

  const transformData = (items: (FolderType | Topic)[]): DataNode[] => {
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

  const titleRenderer = (node: DataNode) => {
    // Topics (leaves) don't get a context menu
    if (node.isLeaf) {
      return <span>{node.title}</span>;
    }
    // Folders get a context menu
    return (
      <Dropdown overlay={menu(node.key as string)} trigger={['contextMenu']}>
        <span>{node.title}</span>
      </Dropdown>
    );
  };

  const treeData = transformData(fakeFolders);

  const onSelect = (selectedKeys: React.Key[], info: any) => {
    console.log('Selected Tree Node:', info.node);
  };

  const onTopicClick = (topic: Topic) => {
    console.log('Selected Root Topic:', topic);
  };

  return (
    <FoldersViewContainer>
      <div>
        <h4>Root Topics</h4>
        <RootTopicList>
          {fakeRootTopics.map(topic => (
            <RootTopicItem key={topic.id} onClick={() => onTopicClick(topic)}>
              <MessageSquare size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }}/>
              {topic.name}
            </RootTopicItem>
          ))}
        </RootTopicList>
      </div>
      <h4>Folders</h4>
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
