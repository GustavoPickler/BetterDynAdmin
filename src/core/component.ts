/**
 * BDA Component API
 * Replaces bda.component.js - typed class using Promises instead of callbacks
 */

import { isNull, logTrace } from './common';

export class BdaComponent {
  /**
   * Set a property value on an ATG Dynamo component
   */
  setProperty(
    domain: string,
    component: string,
    property: string,
    value: string,
  ): Promise<void> {
    const url = `${domain}/dyn/admin/nucleus${component}/?propertyName=${property}`;
    logTrace(`setProperty: POST ${url}`);

    return new Promise((resolve, reject) => {
      jQuery.ajax({
        url,
        type: 'POST',
        data: { atg_admin_property_name: property, atg_admin_property_value: value },
        success: () => resolve(),
        error: (xhr, status, err) => reject(new Error(`setProperty failed: ${status} ${err}`)),
      });
    });
  }

  /**
   * Get a property value from an ATG Dynamo component
   */
  getProperty(
    domain: string,
    component: string,
    property: string,
  ): Promise<string | null> {
    const url = `${domain}/dyn/admin/nucleus${component}/?propertyName=${property}`;
    logTrace(`getProperty: GET ${url}`);

    return new Promise((resolve, reject) => {
      jQuery.ajax({
        url,
        success: (result: string) => {
          try {
            const value = this.extractValueFromPropertyPage(result);
            resolve(value);
          } catch (e) {
            reject(e);
          }
        },
        error: (xhr, status, err) =>
          reject(new Error(`getProperty failed: ${status} ${err}`)),
      });
    });
  }

  /**
   * Call a method on an ATG Dynamo component
   */
  call(
    domain: string,
    component: string,
    method: string,
  ): Promise<string | null> {
    const url = `${domain}/dyn/admin/nucleus${component}/`;
    logTrace(`call: POST ${url}, method=${method}`);

    return new Promise((resolve, reject) => {
      jQuery.ajax({
        url,
        type: 'POST',
        data: { atg_admin_invoke_method: method },
        success: (result: string) => {
          try {
            const value = this.extractMethodCallReturnValue(result);
            resolve(value);
          } catch (e) {
            reject(e);
          }
        },
        error: (xhr, status, err) =>
          reject(new Error(`call failed: ${status} ${err}`)),
      });
    });
  }

  /**
   * Extract property value from a Dynamo property page HTML response
   */
  extractValueFromPropertyPage(result: string): string | null {
    const $result = $(result);
    const $valueHeader = $result.find("h3:contains('Value')");
    if ($valueHeader.length === 0) return null;

    const $valueCell = $valueHeader.closest('table').find('td').first();
    if (isNull($valueCell) || $valueCell.length === 0) return null;

    return $valueCell.text().trim();
  }

  /**
   * Extract return value from a Dynamo method call HTML response
   */
  extractMethodCallReturnValue(result: string): string | null {
    const $result = $(result);

    // Check for invocation failure
    const $failure = $result.find("h3:contains('Invocation Failure')");
    if ($failure.length > 0) {
      throw new Error($failure.next().text().trim());
    }

    // Look for returned object
    const $returnedObj = $result.find("h3:contains('Returned Object')");
    if ($returnedObj.length > 0) {
      return $returnedObj.next().text().trim();
    }

    return null;
  }
}

// Singleton instance
export const bdaComponent = new BdaComponent();
