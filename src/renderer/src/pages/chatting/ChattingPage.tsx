import { FC } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  background-color: var(--color-bg);
`

const Title = styled.h1`
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--color-text);
`

const Content = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
`

const ChattingPage: FC = () => {
  const { t } = useTranslation()
  
  return (
    <Container>
      <Title>{t('chatting.title')}</Title>
      <Content>
        <p>{t('chatting.coming_soon')}</p>
      </Content>
    </Container>
  )
}

export default ChattingPage
