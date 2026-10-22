import { Panel } from '@/shared/ui/Panel'
import { Block, Pulse } from '@/shared/ui/Skeleton'
import styles from './overview.module.css'

/** A panel of gray lines, while what it will say is on its way. The shell announces the loading once. */
export function PanelSkeleton({ rows }: { rows: number }) {
  return (
    <Panel>
      <Pulse className={styles.skeleton}>
        <Block width="45%" height={22} />
        {Array.from({ length: rows }, (_, index) => (
          <Block key={index} width={index % 2 === 0 ? '100%' : '70%'} height={16} />
        ))}
      </Pulse>
    </Panel>
  )
}
