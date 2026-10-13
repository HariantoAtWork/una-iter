import { v7 as uuidv7 } from 'uuid'

/** Time-ordered UUID v7 for array items and persisted records. */
export function newId(): string {
  return uuidv7()
}
