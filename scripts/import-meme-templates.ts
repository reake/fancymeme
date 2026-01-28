#!/usr/bin/env tsx
/**
 * Import Meme Templates Script
 * 
 * Imports templates from templates-data.ts to the database.
 * 
 * Usage:
 *   pnpm tsx scripts/with-env.ts tsx scripts/import-meme-templates.ts
 *   pnpm tsx scripts/with-env.ts tsx scripts/import-meme-templates.ts --dry-run
 *   pnpm tsx scripts/with-env.ts tsx scripts/import-meme-templates.ts --force
 * 
 * Options:
 *   --dry-run  Preview what would be imported without making changes
 *   --force    Overwrite existing templates (by slug)
 */

import { db } from '../src/core/db';
import { memeTemplate } from '../src/config/db/schema';
import { MEME_TEMPLATES } from '../src/shared/blocks/meme/editor/templates-data';
import { eq } from 'drizzle-orm';

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isForce = args.includes('--force');

interface TextBox {
  x?: number;
  y?: number;
  width?: number;
  text?: string;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function importTemplates() {
  console.log('🖼️  Meme Templates Import Script\n');
  console.log(`📊 Found ${MEME_TEMPLATES.length} templates to import\n`);
  
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }
  
  if (isForce) {
    console.log('⚠️  FORCE MODE - Existing templates will be updated\n');
  }

  let imported = 0;
  let skipped = 0;
  let updated = 0;
  let failed = 0;

  for (const template of MEME_TEMPLATES) {
    const slug = template.id || slugify(template.name);
    
    try {
      // Check if template already exists
      const [existing] = await db()
        .select()
        .from(memeTemplate)
        .where(eq(memeTemplate.slug, slug));
      
      if (existing && !isForce) {
        console.log(`⏭️  Skipped: ${template.name} (already exists)`);
        skipped++;
        continue;
      }

      // Convert textBoxes to the format expected by database
      const textAreas = (template.defaultTextBoxes || []).map((box: TextBox, index: number) => ({
        id: `text-${index + 1}`,
        x: box.x ?? 50,
        y: box.y ?? (index === 0 ? 10 : 85),
        width: box.width ?? 90,
        height: 20,
        defaultText: box.text || '',
        fontSize: 32,
        fontColor: '#ffffff',
        fontFamily: 'Impact',
        textAlign: 'center' as const,
        strokeColor: '#000000',
        strokeWidth: 2,
      }));

      // Determine category based on template name or set default
      const category = 'classic'; // All imported templates are classic memes

      const templateData = {
        name: template.name,
        slug,
        imageUrl: template.imageUrl,
        textAreas: JSON.stringify(textAreas),
        category,
        status: 'active',
        source: 'system',
        usageCount: 0,
      };

      if (isDryRun) {
        console.log(`📝 Would import: ${template.name}`);
        console.log(`   Slug: ${slug}`);
        console.log(`   Image: ${template.imageUrl}`);
        console.log(`   Text areas: ${textAreas.length}`);
        imported++;
        continue;
      }

      if (existing && isForce) {
        // Update existing template
        await db()
          .update(memeTemplate)
          .set({
            name: templateData.name,
            imageUrl: templateData.imageUrl,
            textAreas: templateData.textAreas,
            category: templateData.category,
            source: templateData.source,
          })
          .where(eq(memeTemplate.slug, slug));
        
        console.log(`🔄 Updated: ${template.name}`);
        updated++;
      } else {
        // Insert new template
        await db()
          .insert(memeTemplate)
          .values(templateData);
        
        console.log(`✅ Imported: ${template.name}`);
        imported++;
      }
    } catch (error: any) {
      console.error(`❌ Failed: ${template.name} - ${error.message}`);
      failed++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   ✅ Imported: ${imported}`);
  console.log(`   🔄 Updated: ${updated}`);
  console.log(`   ⏭️  Skipped: ${skipped}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📦 Total: ${MEME_TEMPLATES.length}`);

  if (isDryRun) {
    console.log('\n💡 Run without --dry-run to apply changes');
  }
}

importTemplates()
  .then(() => {
    console.log('\n✨ Import complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  });
