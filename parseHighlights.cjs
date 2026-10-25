#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
//const { CsvSyncParser, MarkdownFormatter } = require('oreilly-highlight-parser');
const { CsvSyncParser } = require('oreilly-highlight-parser');

// Helper function to turn chapter titles into URL-friendly anchor slugs
function generateSlug(text){
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .trim()
        .replace(/\s+/g, '-'); //Replace spaces with hyphens
}

async function runParser() {
    try {
        const csvFilePath = '/home/javier/Downloads/quantum-physics-oreilly-annotations.csv';
        const outputDirectory = '/home/javier/Documents/Library/OReilly Notes/output-notes';

        // Ensure the output directory exists
        if (!fs.existsSync(outputDirectory)) {
            fs.mkdirSync(outputDirectory, { recursive: true });
        }

        console.log('Reading O\'Reilly highlights CSV...');
        const fileContent = fs.readFileSync(csvFilePath, 'utf8');

        // 1. Parse raw CSV records
        const parser = new CsvSyncParser();
        const rawRecords = parser.parse(fileContent);
        console.log(`Successfully parsed ${rawRecords.length} highlights.`);
        
        // 2. Filter to keep only yellow highlights
        // (Adjust property name if your CSV uses 'Color' vs 'color')
        const records = rawRecords.filter(record => {
        	const color = (record.color || record.Color || '').trim().toUpperCase();
        	// If color is empty or undefined, you can choose whether to keep it or skip it.
            	// Here we strictly check for 'YELLOW' (or you can remove the filter if some have no color assigned).
            	return color === 'YELLOW' || color === '';
    	});
        
        // 3. Reverse the array to go from first-to-last (chronological order)
        records.reverse();
        console.log(`Parsed ${rawRecords.length} total highlights, kept ${records.length} yellow highlights.`);

        //const formatter = new MarkdownFormatter();

        // 4. Group records by Book Title, then by Chapter Title
        const books = {};
        for (const record of records) {
            const bookTitle = record.bookTitle || 'Unknown Book';
            const chapterTitle = record.chapterTitle || 'General Highlights';

            if (!books[bookTitle]) {
                books[bookTitle] = {};
            }
            if (!books[bookTitle][chapterTitle]) {
                books[bookTitle][chapterTitle] = [];
            }

            // Custom formatting: Highlight text + deep link (no repeated chapter name)
            const cleanQuote = `> ${record.highlight}\n>\n> \\- [Link to Annotation](${record.annotationURL})`;
            books[bookTitle][chapterTitle].push(cleanQuote);
        }

        // 5. Generate clean Markdown files per book
        for (const [bookTitle, chapters] of Object.entries(books)) {
            const safeFileName = bookTitle.replace(/[\/\\?%*:|"<>]/g, '_') + '.md';
            const outPath = path.join(outputDirectory, safeFileName);

            let markdownSections = [`# ${bookTitle}\n`];
            
            // Build Table of Contents
            markdownSections.push(`## Table of Contents`);
            const chapterTitles = Object.keys(chapters);
            for (const chapterTitle of chapterTitles) {
                const slug = generateSlug(chapterTitle);
                markdownSections.push(`- [${chapterTitle}](#${slug})`);
            }
            markdownSections.push(`\n---\n`);
            
            // Build Chapter Sections
            for (const [chapterTitle, quotes] of Object.entries(chapters)) {
                // Add Chapter Heading
                markdownSections.push(`## ${chapterTitle}\n`);
                // Add all quotes for this chapter separated by horizontal rules
                markdownSections.push(quotes.join('\n\n---\n\n'));
            }

            const markdownContent = markdownSections.join('\n');
            fs.writeFileSync(outPath, markdownContent, 'utf8');
            console.log(`Generated note with ToC: ${safeFileName}`);
        }

        console.log(`\nSuccess! All Markdown notes generated in:\n${outputDirectory}`);
    } catch (error) {
        console.error('Error parsing highlights:', error);
    }
}

runParser();
