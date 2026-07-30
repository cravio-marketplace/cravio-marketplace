/**
 * Category service.
 *
 * The menu table stores a free-text `category` string on each item, but we
 * also let vendors build a list of `vendor_categories` and `keyword_mappings`
 * rules. When a new item is created we suggest a category by matching the
 * item name against the vendor's keyword rules.
 */
const supabase = require('../config/supabase');

/**
 * Suggest a category for a new menu item based on the vendor's keyword rules.
 *
 * @param {string} vendorId
 * @param {string} itemName
 * @returns {Promise<string|null>} the matched category name, or null
 */
async function suggestCategory(vendorId, itemName) {
    if (!itemName) return null;
    const { data: rules } = await supabase
        .from('keyword_mappings')
        .select('keyword, category_id, vendor_categories(name)')
        .eq('vendor_id', vendorId);

    if (!rules || rules.length === 0) return null;

    const lower = itemName.toLowerCase();
    const match = rules.find((rule) => lower.includes(String(rule.keyword || '').toLowerCase()));
    if (!match) return null;

    return match.vendor_categories?.name || null;
}

module.exports = { suggestCategory };
