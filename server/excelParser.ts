import * as fs from 'fs';
import * as path from 'path';
import { InsertStudent } from '@shared/schema';

interface ExcelRow {
  [key: string]: any;
}

// Simple function to parse CSV content
function parseCSV(content: string): ExcelRow[] {
  const lines = content.split('\n');
  if (lines.length < 1) return [];
  
  // Try to detect if there's a header row
  const firstLine = lines[0].split(',').map(val => val.trim());
  const hasHeaders = firstLine.some(val => 
    ['student number', 'name', 'email', 'id', 'roll'].some(header => 
      val.toLowerCase().includes(header)
    )
  );
  
  const rows: ExcelRow[] = [];
  
  if (hasHeaders) {
    // If we have headers, process normally
    const headers = firstLine;
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(',').map(val => val.trim());
      const row: ExcelRow = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      rows.push(row);
    }
  } else {
    // If no headers, use column indices as keys
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(',').map(val => val.trim());
      const row: ExcelRow = {};
      
      // Create keys by index
      values.forEach((val, index) => {
        row[`col${index}`] = val;
      });
      
      rows.push(row);
    }
  }
  
  return rows;
}

// Function to extract student data from Excel (CSV) rows
export function extractStudentsFromExcel(fileBuffer: Buffer): InsertStudent[] {
  try {
    const content = fileBuffer.toString('utf-8');
    const rows = parseCSV(content);
    
    // For header-based Excel files (with named columns)
    if (rows.length > 0 && (rows[0]['Student Number'] || rows[0]['student_number'] || rows[0]['Name'] || rows[0]['name'])) {
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
    } 
    // For position-based Excel files (without headers, or with non-standard headers)
    else {
      return rows
        .filter(row => {
          // Extract values by position - column 2 (index 1) for student number and column 4 (index 3) for email
          // We need at least these two fields to have values
          const values = Object.values(row);
          if (values.length < 4) return false;
          
          const studentNumber = values[1]?.toString().trim();
          const email = values[3]?.toString().trim();
          
          return studentNumber && email;
        })
        .map(row => {
          const values = Object.values(row);
          const studentNumber = values[1].toString().trim();
          // For name, use column 3 (index 2) if available, or use column 1 (index 0) as fallback
          const name = (values[2] || values[0] || '').toString().trim();
          const email = values[3].toString().trim();
          
          return {
            studentNumber,
            name,
            email,
            isRegistered: false
          };
        });
    }
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    return [];
  }
}
