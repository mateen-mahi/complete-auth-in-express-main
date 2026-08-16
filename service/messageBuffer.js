import GlobalMessage from "../models/globalMessage.model.js";
import DirectMessage from "../models/directMessage.model.js";

const BATCH_SIZE       = 20;    
const FLUSH_INTERVAL   = 5000; 
class MessageBuffer {
  constructor(Model, label) {
    this.Model  = Model;
    this.label  = label;
    this.buffer = [];
    this.timer  = null;
    this._schedule();
  }

  add(message) {
    this.buffer.push(message);
    if (this.buffer.length >= BATCH_SIZE) {
      this._flush();
    }
  }

  async _flush() {
    clearTimeout(this.timer);

    if (this.buffer.length === 0) {
      this._schedule();
      return;
    }

    const batch = this.buffer.splice(0, this.buffer.length);

    try {
      await this.Model.insertMany(batch, {
        ordered: false,
      });
      console.log(`[${this.label}Buffer] Flushed ${batch.length} message(s) to MongoDB`);
    } catch (err) {
      if (err.code !== 11000) {
        console.error(`[${this.label}Buffer] Flush error:`, err.message);
      }
    } finally {
      this._schedule();
    }
  }

  _schedule() {
    this.timer = setTimeout(() => this._flush(), FLUSH_INTERVAL);
  }

  // Called on graceful shutdown (SIGTERM) to persist the remaining buffer
  // before the process exits. Called from app.js.
  async flushAndShutdown() {
    clearTimeout(this.timer);
    console.log(`[${this.label}Buffer] Shutdown flush — ${this.buffer.length} message(s) remaining`);
    await this._flush();
  }


  // Mutates a single buffered (not-yet-flushed) message in place, if present.
  // Used when a delete request races the 5s flush window.
  patchById(id, updater) {
    const idx = this.buffer.findIndex((m) => m.id === id);
    if (idx === -1) return false;
    updater(this.buffer[idx]);
    return true;
  }

  // Mutates every buffered message matching a predicate — used for
  // "clear conversation", which targets many messages at once.
  patchMany(predicate, updater) {
    let count = 0;
    this.buffer.forEach((m) => {
      if (predicate(m)) { updater(m); count++; }
    });
    return count;
  }
}



export const globalMessageBuffer = new MessageBuffer(GlobalMessage, "Global");
export const directMessageBuffer = new MessageBuffer(DirectMessage, "DM");
