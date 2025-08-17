import { FolderWithChildren } from "@renderer/services/FolderService";
import { Topic } from "@renderer/types";

export const isFolder = (item: FolderWithChildren | Topic): item is FolderWithChildren => {
  return 'children' in item;
};
