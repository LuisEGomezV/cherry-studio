import { ChevronDown, ChevronRight, Folder, MessageSquare, Archive, FolderOpen } from 'lucide-react';
import { FC, useState } from 'react';
import styled from 'styled-components';
import { FolderItem } from '../../types/folder';

interface FolderTreeProps {
  data: FolderItem[];
  onSelect?: (item: FolderItem) => void;
  selectedId?: string;
  level?: number;
}

const getIcon = (type: string, isOpen?: boolean) => {
  switch (type) {
    case 'folder':
      return isOpen ? <FolderOpen size={16} /> : <Folder size={16} />;
    case 'chat':
      return <MessageSquare size={16} />;
    case 'archive':
      return <Archive size={16} />;
    default:
      return null;
  }
};

const FolderTree: FC<FolderTreeProps> = ({
  data,
  onSelect,
  selectedId,
  level = 0,
}) => {
  const [items, setItems] = useState<FolderItem[]>(data);

  const toggleFolder = (id: string) => {
    const updateItems = (items: FolderItem[]): FolderItem[] => {
      return items.map((item) => {
        if (item.id === id) {
          return { ...item, isOpen: !item.isOpen };
        }
        if (item.children) {
          return { ...item, children: updateItems(item.children) };
        }
        return item;
      });
    };

    setItems(updateItems(items));
  };

  const handleItemClick = (e: React.MouseEvent, item: FolderItem) => {
    e.stopPropagation();
    if (item.type === 'folder') {
      toggleFolder(item.id);
    }
    onSelect?.(item);
  };

  const renderTree = (items: FolderItem[], currentLevel: number) => {
    return items.map((item) => {
      const hasChildren = item.children && item.children.length > 0;
      const isFolder = item.type === 'folder';
      const isSelected = selectedId === item.id;
      const isOpen = item.isOpen !== false; // Default to open if not specified

      return (
        <div key={item.id}>
          <FolderItemContainer
            $level={currentLevel}
            $isSelected={isSelected}
            onClick={(e) => handleItemClick(e, item)}
          >
            <FolderItemContent>
              {isFolder && hasChildren ? (
                <ChevronWrapper>
                  {isOpen ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                </ChevronWrapper>
              ) : (
                <ChevronPlaceholder />
              )}
              <IconWrapper>
                {getIcon(item.type, isFolder && isOpen)}
              </IconWrapper>
              <FolderName>{item.name}</FolderName>
            </FolderItemContent>
          </FolderItemContainer>
          {isFolder && isOpen && hasChildren && (
            <ChildrenContainer>
              {renderTree(item.children || [], currentLevel + 1)}
            </ChildrenContainer>
          )}
        </div>
      );
    });
  };

  return <Container>{renderTree(items, level)}</Container>;
};

export default FolderTree;

const Container = styled.div`
  user-select: none;
  width: 100%;
`;

const FolderItemContainer = styled.div<{ $level: number; $isSelected: boolean }>`
  display: flex;
  align-items: center;
  padding: 6px 8px 6px ${(props) => 8 + props.$level * 16}px;
  margin: 2px 0;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
  color: var(--color-text);
  background-color: ${(props) =>
    props.$isSelected ? 'var(--color-primary-light)' : 'transparent'};

  &:hover {
    background-color: var(--color-bg-hover);
  }
`;

const FolderItemContent = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ChevronWrapper = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  color: var(--color-text-secondary);
`;

const ChevronPlaceholder = styled.div`
  width: 20px;
`;

const IconWrapper = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 6px;
  color: var(--color-text-secondary);
`;

const FolderName = styled.span`
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ChildrenContainer = styled.div`
  overflow: hidden;
`;
