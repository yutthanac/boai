// Automated Verification Test for Task/Reminder Deletion & Addition Intents
const assert = require('assert');

// 1. Simulate stripThaiToneMarks
function stripThaiToneMarks(text) {
  return (text || '').replace(/[\u0E48-\u0E4E]/g, '');
}

// 2. Clean schedule text function (same as in aiService.ts)
function cleanScheduleText(text) {
  let clean = (text || '').trim();
  clean = clean.replace(/^(?:ไอ้โนอา|ไอโนอา|น้องโนอา|คุณโนอา|โนอาห์|โนอา|noar\s*ai|noar)\s*[,.:;]?\s*/gi, '');
  clean = clean.replace(/^(?:ช่วย|รบกวน|กรุณา|วาน|ให้|บอกให้(?:โนอา|ไอ้โนอา|น้องโนอา)?|บอก(?:โนอา)?)\s*/gi, '');
  clean = clean.replace(/(?:นะแก|นะจ๊ะ|หน่อยนะ|หน่อยดิ|หน่อยสิ|หน่อยครับ|หน่อยค่ะ|หน่อย|ให้หน่อยนะ|ให้หน่อยครับ|ให้หน่อยค่ะ|ให้หน่อยดิ|ให้หน่อยสิ|ให้หน่อย|ให้เราหน่อย|ให้ฉันหน่อย|ด้วยนะ|ด้วยครับ|ด้วยค่ะ|ด้วย|ทีครับ|ทีค่ะ|ที|ซิ|ซี่)$/gi, '').trim();
  return clean;
}

// 3. Matchers
function testIntent(text) {
  const clean = cleanScheduleText(text);

  // Clear all
  const isClearAll = (
    /(?:ลบ|เคลียร์|ล้าง|เอา)\s*(?:การ)?(?:แจ้งเตือน|ตารางงาน|นัด|รายการเตือน|ตาราง|คิวงาน|งาน)\s*(?:ทั้งหมด|หมดเลย|ทุกอัน|ออกให้หมด|ออกหมด|ให้หมด)/i.test(text) ||
    /(?:ลบ|เคลียร์|ล้าง|เอา)\s*(?:งาน)?(?:ในตารางงาน|ในระบบ|ในตาราง|ออกจากตารางงาน|ออกจากระบบ)\s*(?:ออก|ทิ้ง)?$/i.test(clean) ||
    /^(?:ลบ|เคลียร์|ล้าง|เอา)\s*(?:การ)?(?:แจ้งเตือน|ตารางงาน|นัด|รายการเตือน|ตาราง|คิวงาน)\s*(?:ออก|ทิ้ง)?$/i.test(clean)
  ) && !/(?:มี|ดู|เช็ค|ตรวจ|บอก|ขอดู|มีอะไร|แสดง|บันทึก|ช่วยเตือน|เตือนฉันตอน|ลงตารางงานว่า|\d+)/i.test(clean);

  // Delete demonstrative ("ลบงานนั้น", "ลบงานนั้นๆ", "ลบงานนี้", "เอางานนั้นออก")
  const isDemonstrativeDelete = /^(?:บอกให้(?:โนอา)?\s*)?(?:ลบ|เอา|เคลียร์|ตัด|ทิ้ง)\s*(?:งาน|รายการ|นัด|อัน)?\s*(?:นั้นๆ|นั้น|นี้|นู้น|โน้น)\s*(?:ออก(?:จาก(?:ตารางงาน|ระบบ)?)?|ทิ้ง)?$/i.test(clean);

  // Delete other tasks ("ลบงานอื่น", "ลบงานอื่นๆ")
  const isDeleteOtherTasks = /^(?:บอกให้(?:โนอา)?\s*)?(?:ลบ|เอา|เคลียร์|ตัด|ทิ้ง)\s*(?:งาน|รายการ|นัด)?\s*(?:อื่น|อื่นๆ|ที่เหลือ)\s*(?:ออก(?:จาก(?:ตารางงาน|ระบบ)?)?|ทิ้ง|ให้หมด|หมด)?$/i.test(clean);

  // Delete specific task
  const isDeleteTask = (
    /^(?:บอกให้(?:โนอา|ไอ้โนอา|น้องโนอา)?\s*)?(?:ลบ|เอา|ยกเลิก|ตัด|เคลียร์|ทิ้ง)\s*(?:รายการ|การแจ้งเตือน|ตารางงาน|นัด|งาน|สิ่งที่ต้องทำ)\s*(.+)/i.test(clean) ||
    /^(?:เอางาน|ลบงาน|เอารายการ|ลบรายการ)\s+(.+)/i.test(clean) ||
    /^(?:ลบ|เอาออก|ยกเลิก)\s+(.+?)\s*(?:ออก(?:จาก(?:ตารางงาน|ระบบ|เครื่อง)?)?|ทิ้ง)?$/i.test(clean)
  ) && !/(?:บันทึก|ช่วยเตือน|เตือนฉันตอน|ลงตาราง|เพิ่มงาน|มีงาน|ดูงาน|ตารางงานมี)/i.test(text);

  // Add without details
  const isAddWithoutDetails = /^(?:บอกให้(?:โนอา|ไอ้โนอา|น้องโนอา)?\s*)?(?:ช่วย|รบกวน)?\s*(?:เพิ่มงาน|เพิ่มงานอื่น|เพิ่มงานใหม่|เพิ่มอีกงาน|ลงงานเพิ่ม|มีงานเพิ่ม|มีงานอื่นอีก|มีอีกงาน|ใส่งานเพิ่ม|เพิ่มตารางงาน)\s*$/i.test(clean);

  // Add with details
  const isScheduleSave = (
    /(?:เพิ่มงานอื่นว่า|เพิ่มงานอื่นอีกว่า|เพิ่มงานอื่นอีก|เพิ่มงานอื่น|เพิ่มงานใหม่ว่า|เพิ่มงานใหม่|เพิ่มอีกงานว่า|เพิ่มอีกงาน|เพิ่มงานว่า|เพิ่มงาน|มีงานอื่นอีกว่า|มีงานอื่นอีก|มีอีกงานว่า|มีอีกงาน|มีงานเพิ่มว่า|มีงานเพิ่ม|ลงงานเพิ่มว่า|ลงงานเพิ่ม|ลงงานว่า|ลงงาน|ใส่งานว่า|ใส่งาน|จัดงานว่า|จัดงาน|บันทึกงานว่า|บันทึกงาน|บอกให้โนอาเพิ่มงาน|บอกให้โนอาลงงาน|บอกโนอาเพิ่มงาน|บอกโนอาลงตาราง|บอกให้ลงตาราง|จัดตารางงาน|จัดตารางเวลา|จัดตาราง|บันทึกตารางงาน|บันทึกการแจ้งเตือน|บันทึกนัด|บันทึกเตือน|บันทึกว่า|ช่วยเตือนว่า|ช่วยเตือน|เตือนให้หน่อย|ตั้งเตือนว่า|ตั้งเตือน|เตือนฉันตอน|เตือนตอน|เตือนเราตอน|ช่วยบันทึก|บันทึกนัดหมาย|เตือนว่า)/i.test(text) ||
    /(?:บันทึกว่า|ลงนัดว่า|ลงตารางว่า)\s*(.+)/i.test(text) ||
    /^(?:บันทึก|ช่วยบันทึก|ลงตาราง|เตือน)\s+/i.test(text) ||
    /(?:เวลา|ช่วงเวลา|ตอน)\s+[\u0E00-\u0E7Fa-zA-Z0-9.:\s]+\s*(?:ถึง|-|จนถึง)\s*[\u0E00-\u0E7Fa-zA-Z0-9.:\s]+/i.test(text)
  ) && !/(?:กี่โมง|เวลาตอนนี้|นาฬิกา|เวลาเท่าไหร่|เวลาเท่าไร|วันอะไร|วันที่เท่าไหร่|วันนี้วันอะไร|time|clock|ลบ|เอาออก|ยกเลิก)/i.test(text);

  // View / Query schedule
  const isScheduleQuery = (
    /(?:มี|ดู|เช็ค|ตรวจ|บอก|ขอ|สรุป|เปิด|เอา.*มาดู|ขอดู|แสดง|เลือกดู)\s*(?:รายการ)?\s*(?:การ)?(?:แจ้งเตือน|เตือน|นัด|ตารางงาน|ตาราง|กำหนดการ|คิวงาน|งาน)/i.test(text) ||
    /(?:เอา|ขอ|เปิด|ดึง)\s*(?:ตารางงาน|ตาราง|การแจ้งเตือน|คิวงาน|งาน)\s*(?:มาดู|มาตรวจ|มาเช็ค|ออกมา)/i.test(text) ||
    /(?:แจ้งเตือน|เตือน|นัด|ตารางงาน|ตาราง|กำหนดการ|คิวงาน|งาน|สิ่งที่ต้องทำ)\s*(?:มีอะไรบ้าง|อะไรบ้าง|มีไหม|มีมั้ย|ทั้งหมด|วันนี้มีอะไร|มีอะไร)/i.test(text) ||
    /(?:ตารางงานวันนี้|งานวันนี้|งานพรุ่งนี้|งานมีอะไรบ้าง|ตารางมีอะไรบ้าง)/i.test(text) ||
    /(?:รายการ\s*(?:การ)?(?:แจ้งเตือน|เตือน|นัด|ตารางงาน|สิ่งที่ต้องทำ))/i.test(text) ||
    /(?:ตอนนี้|ตินนี้|วันนี้|เรา)\s*(?:มี|ต้องทำ|มีอะไร)\s*(?:แจ้งเตือน|เตือน|นัด|ตารางงาน|งาน)?\s*(?:อะไรบ้าง|ไหม|มั้ย)/i.test(text) ||
    /(?:เลือกดูงาน|เลือกดูตารางงาน|เลือกดูตาราง|เลือกดู|เวลาเลือกดู)/i.test(clean) ||
    /(?:reminders?|schedule|task)\s*(?:list|check|view|show|what)/i.test(text)
  ) && !/(?:บันทึก.*ให้หน่อย|ช่วยเตือนว่า|ช่วยเตือน|เตือนให้หน่อย|ตั้งเตือน|เตือนฉันตอน|เตือนตอน|ลงตาราง|เพิ่มงาน|มีงานเพิ่ม|ลบงาน|ลบ|เอาออก|ยกเลิก)/i.test(text);

  return {
    isClearAll,
    isDemonstrativeDelete,
    isDeleteOtherTasks,
    isDeleteTask,
    isAddWithoutDetails,
    isScheduleSave,
    isScheduleQuery
  };
}

console.log('--- STARTING VERIFICATION TESTS ---');

// Test 1: User says "บอกให้ลบงานนั้นๆ"
const t1 = testIntent('บอกให้ลบงานนั้นๆ');
assert.strictEqual(t1.isDemonstrativeDelete, true, 'Test 1 Failed: บอกให้ลบงานนั้นๆ should match isDemonstrativeDelete');
console.log('✓ Test 1 Passed: "บอกให้ลบงานนั้นๆ" -> isDemonstrativeDelete');

// Test 2: User says "ลบงานนั้น"
const t2 = testIntent('ลบงานนั้น');
assert.strictEqual(t2.isDemonstrativeDelete, true, 'Test 2 Failed: ลบงานนั้น should match isDemonstrativeDelete');
console.log('✓ Test 2 Passed: "ลบงานนั้น" -> isDemonstrativeDelete');

// Test 3: User says "เอางานนั้นออก"
const t3 = testIntent('เอางานนั้นออก');
assert.strictEqual(t3.isDemonstrativeDelete, true, 'Test 3 Failed: เอางานนั้นออก should match isDemonstrativeDelete');
console.log('✓ Test 3 Passed: "เอางานนั้นออก" -> isDemonstrativeDelete');

// Test 4: User says "ลบงานสุกี้ตี้น้อย"
const t4 = testIntent('ลบงานสุกี้ตี้น้อย');
assert.strictEqual(t4.isDeleteTask, true, 'Test 4 Failed: ลบงานสุกี้ตี้น้อย should match isDeleteTask');
console.log('✓ Test 4 Passed: "ลบงานสุกี้ตี้น้อย" -> isDeleteTask');

// Test 5: User says "ลบงานอื่น" / "ลบงานอื่นๆ"
const t5 = testIntent('ลบงานอื่น');
assert.strictEqual(t5.isDeleteOtherTasks, true, 'Test 5 Failed: ลบงานอื่น should match isDeleteOtherTasks');
console.log('✓ Test 5 Passed: "ลบงานอื่น" -> isDeleteOtherTasks');

// Test 6: User says "เพิ่มงานอื่นว่า ประชุม 10 โมง"
const t6 = testIntent('เพิ่มงานอื่นว่า ประชุม 10 โมง');
assert.strictEqual(t6.isScheduleSave, true, 'Test 6 Failed: เพิ่มงานอื่นว่า ประชุม 10 โมง should match isScheduleSave');
console.log('✓ Test 6 Passed: "เพิ่มงานอื่นว่า ประชุม 10 โมง" -> isScheduleSave');

// Test 7: User says "เพิ่มงาน" (without details)
const t7 = testIntent('เพิ่มงาน');
assert.strictEqual(t7.isAddWithoutDetails, true, 'Test 7 Failed: เพิ่มงาน should match isAddWithoutDetails');
console.log('✓ Test 7 Passed: "เพิ่มงาน" -> isAddWithoutDetails (prompts user for details)');

// Test 8: User says "เพิ่มงานอื่น" (without details)
const t8 = testIntent('เพิ่มงานอื่น');
assert.strictEqual(t8.isAddWithoutDetails, true, 'Test 8 Failed: เพิ่มงานอื่น should match isAddWithoutDetails');
console.log('✓ Test 8 Passed: "เพิ่มงานอื่น" -> isAddWithoutDetails (prompts user for details)');

// Test 9: User says "เวลาเลือกดู" / "เลือกดูงาน"
const t9 = testIntent('เวลาเลือกดู');
assert.strictEqual(t9.isScheduleQuery, true, 'Test 9 Failed: เวลาเลือกดู should match isScheduleQuery');
const t9b = testIntent('เลือกดูงาน');
assert.strictEqual(t9b.isScheduleQuery, true, 'Test 9b Failed: เลือกดูงาน should match isScheduleQuery');
console.log('✓ Test 9 Passed: "เวลาเลือกดู" and "เลือกดูงาน" -> isScheduleQuery');

// Test 10: Action Tags Parser Simulation
function parseActionTags(text) {
  const actions = [];
  const delRegex = /\[\[ACTION:DELETE_REMINDER:(.+?)\]\]/gi;
  let delMatch;
  while ((delMatch = delRegex.exec(text)) !== null) {
    actions.push({ type: 'DELETE_REMINDER', target: delMatch[1].trim() });
  }
  const addRegex = /\[\[ACTION:ADD_REMINDER:(.+?)\]\]/gi;
  let addMatch;
  while ((addMatch = addRegex.exec(text)) !== null) {
    actions.push({ type: 'ADD_REMINDER', payload: addMatch[1].trim() });
  }
  const cleaned = text.replace(/\[\[ACTION:[^\]]+\]\]/gi, '').trim();
  return { actions, cleaned };
}

const llmResponse = 'ลบงานสุกี้ตี้น้อยออกจากตารางให้เรียบร้อยแล้วค่ะ [[ACTION:DELETE_REMINDER:สุกี้ตี้น้อย]]';
const parsed = parseActionTags(llmResponse);
assert.strictEqual(parsed.actions.length, 1);
assert.strictEqual(parsed.actions[0].type, 'DELETE_REMINDER');
assert.strictEqual(parsed.actions[0].target, 'สุกี้ตี้น้อย');
assert.strictEqual(parsed.cleaned, 'ลบงานสุกี้ตี้น้อยออกจากตารางให้เรียบร้อยแล้วค่ะ');
console.log('✓ Test 10 Passed: LLM Action Tag parsed & stripped cleanly');

console.log('--- ALL 10 TESTS PASSED SUCCESFULLY! ---');
