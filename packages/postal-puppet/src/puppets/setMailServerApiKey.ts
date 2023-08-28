import type { PuppetInstance } from '../index';

export async function setMailServerApiKey(
  puppetInstance: PuppetInstance,
  orgId: string,
  orgPublicId: string,
  serverId: string
): Promise<{
  data: {
    orgId: string;
    serverId: string;
    apiKey: string;
  } | null;
  error: Error | null;
}> {
  try {
    puppetInstance.page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
    await puppetInstance.page.goto(
      `${puppetInstance.url}/org/${orgPublicId}/servers/${serverId}/credentials` // as string
    );
    await puppetInstance.page.waitForNetworkIdle();
    await puppetInstance.page.waitForFunction(
      () =>
        //@ts-expect-error - TS doesn't know it's running in the browser context
        document.querySelectorAll(
          'ul[class="credentialList u-margin"], div[class="noData noData--clean"]'
        ).length
    );

    /// check and delete the existing records
    const existingRecords = await puppetInstance.page.$$(
      'span[class="label label--credentialType-api"]'
    );

    if (existingRecords.length) {
      for (const entry of existingRecords) {
        await entry.click();
        await puppetInstance.page
          .locator(
            `a[data-confirm="Are you sure you wish to delete this credential?"]`
          )
          .click();
        await puppetInstance.page.waitForNetworkIdle();
      }
    }
    // Create new Api Key
    await puppetInstance.page.goto(
      `${puppetInstance.url}/org/${orgPublicId}/servers/${serverId}/credentials/new` // as string
    );
    await puppetInstance.page.select('select[id="credential_type"]', 'API');
    await puppetInstance.page
      .locator('input[id="credential_name"]')
      .fill(`${serverId}-api`);
    await puppetInstance.page.click('[name="commit"]');
    await puppetInstance.page.waitForNetworkIdle();

    //Extract new api key
    await puppetInstance.page.goto(
      `${puppetInstance.url}/org/${orgPublicId}/servers/${serverId}/credentials` // as string
    );
    await puppetInstance.page
      .locator('span[class="label label--credentialType-api"]')
      .click();
    const credentialKey = await puppetInstance.page
      .locator('input[id="credential_key"]')
      .map((el) => el.value)
      .wait();

    await puppetInstance.page.waitForNetworkIdle();

    return {
      data: {
        orgId,
        serverId,
        apiKey: credentialKey
      },
      error: null
    };
  } catch (error: any) {
    console.log('Postal: setMailServerWebhook Error:', error);
    return {
      data: null,
      error: error
    };
  }
}
