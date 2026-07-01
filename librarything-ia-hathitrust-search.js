// ==UserScript==
// @name         LibraryThing - Internet Archive & HathiTrust Search
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Add quick search links to Internet Archive and HathiTrust on LibraryThing book pages
// @author       You
// @match        https://www.librarything.com/work/*
// @match        https://www.librarything.com/book/*
// @icon         https://www.librarything.com/favicon.ico
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Extract ISBN from the page
    function getISBN() {
        // Try to find ISBN in various common places on LibraryThing
        const isbnPatterns = [
            document.querySelector('[data-isbn]')?.getAttribute('data-isbn'),
            document.querySelector('a[href*="isbn"]')?.textContent?.match(/\d{10}(?:\d{3})?/)?.[0],
            Array.from(document.querySelectorAll('*')).find(el => 
                el.textContent?.includes('ISBN')
            )?.textContent?.match(/ISBN[:\s]*([0-9-]{10,})/i)?.[1]?.replace(/-/g, ''),
        ];
        return isbnPatterns.find(isbn => isbn);
    }

    // Extract Title from the page
    function getTitle() {
        const titleEl = document.querySelector('h1[data-itemid]') || 
                       document.querySelector('h1.booktitle') ||
                       document.querySelector('h1');
        return titleEl?.textContent?.trim() || '';
    }

    // Extract Author from the page
    function getAuthor() {
        const authorEl = document.querySelector('a[href*="/author/"]') ||
                        document.querySelector('[data-author]') ||
                        Array.from(document.querySelectorAll('a')).find(el =>
                            el.href?.includes('/author/')
                        );
        return authorEl?.textContent?.trim() || '';
    }

    // Create search URLs
    function createSearchUrls(isbn, title, author) {
        const urls = {};

        if (isbn) {
            urls.ia = `https://archive.org/search.php?query=isbn:${isbn}`;
            urls.ht = `https://www.hathitrust.org/cgi/ls?q1=isbn:${isbn}`;
        } else if (title && author) {
            const query = `${title} ${author}`;
            urls.ia = `https://archive.org/search.php?query=${encodeURIComponent(query)}`;
            urls.ht = `https://www.hathitrust.org/cgi/ls?q1=${encodeURIComponent(query)}`;
        } else if (title) {
            urls.ia = `https://archive.org/search.php?query=${encodeURIComponent(title)}`;
            urls.ht = `https://www.hathitrust.org/cgi/ls?q1=${encodeURIComponent(title)}`;
        }

        return urls;
    }

    // Create the toolbar
    function createToolbar(urls) {
        const toolbar = document.createElement('div');
        toolbar.id = 'lt-search-toolbar';
        toolbar.style.cssText = `
            background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 12px 16px;
            margin: 12px 0;
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            align-items: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        `;

        // Add label
        const label = document.createElement('span');
        label.style.cssText = `
            font-weight: 600;
            color: #333;
            font-size: 13px;
            white-space: nowrap;
        `;
        label.textContent = 'Search:';
        toolbar.appendChild(label);

        // Add Internet Archive button
        const iaBtn = document.createElement('a');
        iaBtn.href = urls.ia || '#';
        iaBtn.target = '_blank';
        iaBtn.rel = 'noopener noreferrer';
        iaBtn.style.cssText = `
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 14px;
            background: #4a90e2;
            color: white;
            text-decoration: none;
            border-radius: 3px;
            font-size: 12px;
            font-weight: 500;
            transition: background 0.2s;
        `;
        iaBtn.textContent = '📚 Internet Archive';
        iaBtn.onmouseover = () => iaBtn.style.background = '#357abd';
        iaBtn.onmouseout = () => iaBtn.style.background = '#4a90e2';
        if (!urls.ia) iaBtn.style.opacity = '0.5';
        toolbar.appendChild(iaBtn);

        // Add HathiTrust button
        const htBtn = document.createElement('a');
        htBtn.href = urls.ht || '#';
        htBtn.target = '_blank';
        htBtn.rel = 'noopener noreferrer';
        htBtn.style.cssText = `
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 14px;
            background: #e74c3c;
            color: white;
            text-decoration: none;
            border-radius: 3px;
            font-size: 12px;
            font-weight: 500;
            transition: background 0.2s;
        `;
        htBtn.textContent = '🔍 HathiTrust';
        htBtn.onmouseover = () => htBtn.style.background = '#c0392b';
        htBtn.onmouseout = () => htBtn.style.background = '#e74c3c';
        if (!urls.ht) htBtn.style.opacity = '0.5';
        toolbar.appendChild(htBtn);

        return toolbar;
    }

    // Main function to initialize
    function init() {
        const isbn = getISBN();
        const title = getTitle();
        const author = getAuthor();

        if (!isbn && !title) {
            console.log('LibraryThing Search: Could not extract book information');
            return;
        }

        const urls = createSearchUrls(isbn, title, author);

        if (!urls.ia && !urls.ht) {
            console.log('LibraryThing Search: Could not create search URLs');
            return;
        }

        const toolbar = createToolbar(urls);

        // Find the best place to insert the toolbar
        // Try to insert after the main title
        const titleEl = document.querySelector('h1[data-itemid]') || 
                       document.querySelector('h1.booktitle') ||
                       document.querySelector('h1');

        if (titleEl && titleEl.parentNode) {
            titleEl.parentNode.insertBefore(toolbar, titleEl.nextSibling);
        } else {
            // Fallback: insert at the top of the main content
            const mainContent = document.querySelector('main') || 
                               document.querySelector('.content') ||
                               document.querySelector('#content');
            if (mainContent) {
                mainContent.insertBefore(toolbar, mainContent.firstChild);
            }
        }

        console.log('LibraryThing Search toolbar added', {
            isbn: isbn || 'N/A',
            title,
            author,
            searchType: isbn ? 'ISBN' : 'Title/Author'
        });
    }

    // Wait for page to fully load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
