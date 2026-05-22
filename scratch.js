const dotenv = require('dotenv');
dotenv.config({path: '.env.local'});
const PocketBase = require('pocketbase/cjs');
const pb = new PocketBase(process.env.POCKETBASE_URL);

async function run() {
  try {
    await pb.admins.authWithPassword(process.env.POCKETBASE_ADMIN_EMAIL, process.env.POCKETBASE_ADMIN_PASSWORD);
    const groups = await pb.collection('groups').getFullList();
    if (groups.length > 0) {
      const gId = groups[0].id;
      console.log('Group ID:', gId);
      const modules = await pb.collection('group_modules').getFullList({ filter: `group_id = "${gId}"`, sort: "order" });
      console.log('Modules:', modules);
    } else {
      console.log('No groups found');
    }
  } catch (err) {
    console.error('Error:', err);
  }
}
run();
