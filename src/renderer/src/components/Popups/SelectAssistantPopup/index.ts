import { Assistant } from '@renderer/types'
import { TopView } from '@renderer/components/TopView'
import React from 'react'
import PopupContainer from './popup'

const TopViewKey = 'SelectAssistantPopup'

export class SelectAssistantPopup {
  static hide() {
    TopView.hide(TopViewKey)
  }

  static show(params: { currentAssistantId?: string }) {
    return new Promise<Assistant | undefined>((resolve) => {
      const element = React.createElement(PopupContainer as any, { ...params, resolve: (v: Assistant | undefined) => resolve(v) })
      TopView.show(element, TopViewKey)
    })
  }
}

export default SelectAssistantPopup
