const { runQuery, getRow, getAll } = require('./server/db');

async function performFreshDevelopmentReset() {
  console.log('================================================================');
  console.log('AUTOLEAD CRM: FRESH DEVELOPMENT DATABASE RESET');
  console.log('================================================================\n');

  try {
    // 1. Fetch Super Admin User ID to preserve
    let superAdmin = await getRow(`SELECT * FROM users WHERE email = 'amautomationtrading@gmail.com'`);

    if (!superAdmin) {
      console.log('[RESET] Creating Primary Super Admin (amautomationtrading@gmail.com)...');
      const bcrypt = require('./server/node_modules/bcryptjs');
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash('password123', salt);
      const user_id = 'usr_superadmin_master';
      await runQuery(
        `INSERT INTO users (user_id, workspace_id, full_name, company_name, email, password_hash, role, status, subscription_exempt)
         VALUES (?, ?, 'Amit Mehra (AM Automation Trading)', 'AM Automation Trading', 'amautomationtrading@gmail.com', ?, 'super_admin', 'active', 1)`,
        [user_id, user_id, password_hash]
      );
      superAdmin = await getRow(`SELECT * FROM users WHERE email = 'amautomationtrading@gmail.com'`);
    } else {
      await runQuery(
        `UPDATE users SET role = 'super_admin', status = 'active', subscription_exempt = 1 WHERE email = 'amautomationtrading@gmail.com'`
      );
    }

    const superAdminUserId = superAdmin.user_id;
    const superAdminWorkspaceId = superAdmin.workspace_id || superAdminUserId;

    console.log(`[PRESERVED ACCOUNT] Primary Super Admin: ${superAdmin.email} (ID: ${superAdminUserId})`);

    // 2. PURGE ALL TEST / QA CUSTOMER USERS EXCEPT SUPER ADMIN
    const userDeleteResult = await runQuery(`DELETE FROM users WHERE email != 'amautomationtrading@gmail.com'`);
    console.log(`[CLEANUP] Deleted test/QA customer users: ${userDeleteResult.changes || 0}`);

    // 3. PURGE ALL SUBSCRIPTIONS EXCEPT SUPER ADMIN
    const subDeleteResult = await runQuery(`DELETE FROM subscriptions WHERE workspace_id != ? AND user_id != ?`, [superAdminWorkspaceId, superAdminUserId]);
    console.log(`[CLEANUP] Deleted customer subscriptions: ${subDeleteResult.changes || 0}`);

    // 4. PURGE ORPHANED LEADS NOT BELONGING TO SUPER ADMIN
    const leadsDeleteResult = await runQuery(`DELETE FROM leads WHERE user_id != ? AND workspace_id != ?`, [superAdminUserId, superAdminWorkspaceId]);
    console.log(`[CLEANUP] Deleted customer/QA test leads: ${leadsDeleteResult.changes || 0}`);

    // 5. PURGE WEBSITE SCANS NOT BELONGING TO SUPER ADMIN
    const scansDeleteResult = await runQuery(`DELETE FROM website_scans WHERE user_id != ?`, [superAdminUserId]);
    console.log(`[CLEANUP] Deleted website scans: ${scansDeleteResult.changes || 0}`);

    // 6. PURGE AUDIT LOGS NOT BELONGING TO SUPER ADMIN
    const auditDeleteResult = await runQuery(`DELETE FROM audit_logs WHERE user_id != ? AND workspace_id != ?`, [superAdminUserId, superAdminWorkspaceId]);
    console.log(`[CLEANUP] Deleted test audit logs: ${auditDeleteResult.changes || 0}`);

    // 7. PURGE CONTACTS, CAMPAIGNS, LOGS, IMPORT HISTORY
    await runQuery(`DELETE FROM contacts WHERE user_id != ?`, [superAdminUserId]);
    await runQuery(`DELETE FROM email_campaigns WHERE user_id != ?`, [superAdminUserId]);
    await runQuery(`DELETE FROM email_logs WHERE user_id != ?`, [superAdminUserId]);
    await runQuery(`DELETE FROM import_history WHERE user_id != ?`, [superAdminUserId]);
    await runQuery(`DELETE FROM saved_filters WHERE user_id != ?`, [superAdminUserId]);

    // 8. VERIFY FINAL DATABASE COUNTS
    const totalUsersRow = await getRow(`SELECT COUNT(*) as cnt FROM users`);
    const customerUsersRow = await getRow(`SELECT COUNT(*) as cnt FROM users WHERE role != 'super_admin' AND role != 'SUPER_ADMIN'`);
    const customerWorkspacesRow = await getRow(`SELECT COUNT(DISTINCT workspace_id) as cnt FROM users WHERE role != 'super_admin' AND role != 'SUPER_ADMIN' AND workspace_id != ''`);

    console.log('\n================================================================');
    console.log('FRESH DATABASE RESET VERIFICATION SUMMARY:');
    console.log(`- Total Platform Users: ${totalUsersRow ? totalUsersRow.cnt : 0} (Super Admin Only)`);
    console.log(`- Customer Admins & Normal Users: ${customerUsersRow ? customerUsersRow.cnt : 0}`);
    console.log(`- Customer Workspaces: ${customerWorkspacesRow ? customerWorkspacesRow.cnt : 0}`);
    console.log('================================================================\n');

    console.log('✅ FRESH DEVELOPMENT DATABASE RESET COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Reset Error:', err);
  }
}

performFreshDevelopmentReset();
