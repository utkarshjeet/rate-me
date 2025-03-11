import * as fs from 'fs';
import * as path from 'path';
import { InsertStudent } from '@shared/schema';

interface ExcelRow {
  [key: string]: any;
}

// Simple function to parse CSV content
function parseCSV(content: string): ExcelRow[] {
  const lines = content.split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(header => header.trim());
  const rows: ExcelRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values = lines[i].split(',').map(val => val.trim());
    const row: ExcelRow = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    rows.push(row);
  }
  
  return rows;
}

// Function to extract student data from Excel (CSV) rows
export function extractStudentsFromExcel(fileBuffer: Buffer): InsertStudent[] {
  try {
    const content = fileBuffer.toString('utf-8');
    const rows = parseCSV(content);
    
    return rows
      .filter(row => {
        // Ensure we have student number, name, and email
        const hasStudentNumber = row['Student Number'] || row['student_number'] || '';
        const hasName = row['Name'] || row['name'] || '';
        const hasEmail = row['Email'] || row['email'] || '';
        
        return hasStudentNumber && hasName && hasEmail;
      })
      .map(row => {
        const studentNumber = (row['Student Number'] || row['student_number'] || '').toString().trim();
        const name = (row['Name'] || row['name'] || '').toString().trim();
        const email = (row['Email'] || row['email'] || '').toString().trim();
        
        return {
          studentNumber,
          name,
          email,
          isRegistered: false
        };
      });
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    return [];
  }
}
