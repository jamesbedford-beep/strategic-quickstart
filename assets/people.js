/* Optional roster for the team-name autocomplete. Typing "Gra" suggests
   "Grace Hultquist" and fills in her initials and role.

   This file is entirely optional: delete it, empty the array, or drop the
   <script> tag and the tool works exactly as before, just without suggestions.
   Nothing here is sent anywhere; it is read in the browser only.

   To adapt it for your own team, replace the entries. Format:
     n  full name
     r  role or title
     t  team, program, or function

   Roles reflect what internal documents stated at the time of writing and go
   stale as people move. The picker is a convenience, not a source of truth for
   titles: correct anything wrong before an export goes to anyone. */
(function (SIK) {
  'use strict';

  SIK.people = [
    /* --- Programs: leadership and program leads --- */
    { n: 'Kate McCracken', r: 'Director, Deworm the World', t: 'Deworm the World' },
    { n: 'Anam Abdulla', r: 'Associate Director, DTW and IFA', t: 'Deworm the World' },
    { n: 'Rebekah Chang', r: 'Associate Director, Nutrition', t: 'Nutrition' },
    { n: 'Katie Callahan', r: 'Director, Safe Water Now', t: 'Safe Water Now' },
    { n: 'Anna Konstantinova', r: 'Director, Syphilis-Free Start', t: 'Syphilis-Free Start' },
    { n: 'Mark Minnery', r: 'Associate Director and Lead Epidemiologist', t: 'Global Programs' },
    { n: 'Natalie Duarte', r: 'Director, MLE', t: 'MLE' },
    { n: 'Andrew Wang', r: 'Associate Director, Cost-Effectiveness', t: 'Cost-Effectiveness' },
    { n: 'Kyle Holloway', r: 'Global lead, Accelerator', t: 'Accelerator / NPD' },
    { n: 'Colin Richardson', r: 'Associate Director, New Programs Development', t: 'Accelerator / NPD' },
    { n: 'Sarah Thompson', r: 'Director of Strategic Initiatives', t: 'Strategic Initiatives' },
    { n: 'Katie Donley', r: 'Project Director', t: 'Strategic Initiatives' },
    { n: 'Rajab Hamisi', r: 'Chief of Staff, Head of Regional Planning and Coordination', t: 'Management' },
    { n: 'Karen Olege', r: 'Associate Director, People and Culture', t: 'People and Culture' },
    { n: 'Kanika Bahl', r: 'Leadership', t: 'Leadership' },
    { n: 'Danielle Bayer', r: 'Leadership', t: 'Leadership' },

    /* --- Country and regional --- */
    { n: 'Chrispin Owaga', r: 'Country Director, Kenya and Malawi', t: 'Kenya / Malawi' },
    { n: 'Namakau Nyambe', r: 'Country Director, Zambia', t: 'Zambia' },
    { n: 'Tope Ogunbi', r: 'Country Director, Nigeria', t: 'Nigeria' },
    { n: 'Emilie Efronson', r: 'Country Director, Liberia', t: 'Liberia' },
    { n: 'Marinnette Ngo Nemb', r: 'Country Director, Cameroon', t: 'Cameroon' },
    { n: 'Richard Kibuuka', r: 'Country Director, Uganda', t: 'Uganda' },
    { n: 'Moses Baraza', r: 'Associate Director, Safe Water Now, ESA', t: 'Safe Water Now' },
    { n: 'Illah Evance', r: 'Associate Director, MLE, Africa', t: 'MLE' },

    /* --- Program managers and program staff --- */
    { n: 'Grace Hultquist', r: 'Program Manager, Nutrition (SQ-LNS lead)', t: 'Nutrition' },
    { n: 'Savannah Newman', r: 'Program Manager, Nutrition (MMS lead)', t: 'Nutrition' },
    { n: 'Eliza Walwyn-Jones', r: 'Program Manager, Nutrition (IFA India)', t: 'Nutrition' },
    { n: 'Sitara Kumbale', r: 'Manager, New Programs Development', t: 'Accelerator / NPD' },
    { n: 'Kristopher Mills', r: 'Senior Program Manager, Syphilis-Free Start', t: 'Syphilis-Free Start' },
    { n: 'Toochi Ohaji', r: 'Senior Program Manager, Nigeria', t: 'Nigeria' },
    { n: 'Maryann Edeh', r: 'Senior Program Manager, Nigeria', t: 'Nigeria' },
    { n: 'Samson Wakoli', r: 'Program Manager, Safe Water Now, Kenya', t: 'Safe Water Now' },
    { n: 'Moses Chisangwala', r: 'Program Manager, Safe Water Now, Malawi', t: 'Safe Water Now' },
    { n: 'Evelyn Anek', r: 'Program Manager, Safe Water, Uganda', t: 'Safe Water Now' },
    { n: 'Diana Munanka', r: 'Program Manager, Deworm the World, Kenya', t: 'Deworm the World' },
    { n: 'Linda Matita', r: 'Senior Program Manager, Malawi', t: 'Malawi' },
    { n: 'Riley Edwards', r: 'Safe Water Now', t: 'Safe Water Now' },
    { n: 'Anna Walker', r: 'Safe Water Now', t: 'Safe Water Now' },
    { n: 'Gabriel Ngoga', r: 'Safe Water Now, Kenya', t: 'Safe Water Now' },

    /* --- MLE --- */
    { n: 'Ify Chime', r: 'Senior Manager, MLE', t: 'MLE' },
    { n: 'Faridah Mungoni', r: 'Manager, MLE Field Monitoring', t: 'MLE' },
    { n: 'Ferdnand Ongeta', r: 'Manager, MLE', t: 'MLE' },
    { n: 'Hilda Nanzala', r: 'Senior Associate, MLE Field Monitoring', t: 'MLE' },
    { n: 'Gentrix Obinda', r: 'Senior Associate, MLE Field Monitoring', t: 'MLE' },
    { n: 'Emmanuel Mngoli', r: 'Senior Associate, MLE Field Monitoring', t: 'MLE' },

    /* --- People, hiring, operations --- */
    { n: 'Kali Bell', r: 'Senior recruiting', t: 'People and Culture' },
    { n: 'Chris Dunn', r: 'Governance, job descriptions and titles', t: 'Management' },

    /* --- EAII Advisors, India technical partner --- */
    { n: 'Priyanka Roy', r: 'Director, MLE and Health and Nutrition', t: 'EAII Advisors' },
    { n: 'Bimlesh Kumar', r: 'Director, Programs, India Safe Water', t: 'EAII Advisors' },
    { n: 'Ajay Singh', r: 'Principal Manager, Safe Water Operations', t: 'EAII Advisors' },
    { n: 'Ankur Sooden', r: 'National Program Manager, Programs, IFA', t: 'EAII Advisors' },
    { n: 'Nitin Sharma', r: 'Senior Manager, Tech and MLE', t: 'EAII Advisors' },
    { n: 'Tejesh Chawda', r: 'Principal Manager, Supply Chain Operations', t: 'EAII Advisors' },
    { n: 'Pratyush Bishi', r: 'State Program Manager, Bihar IFA lead', t: 'EAII Advisors' },
    { n: 'Abhinav Anand', r: 'Associate Director, Program Management, India Safe Water', t: 'EAII Advisors' },
    { n: 'Anurag Taneja', r: 'Associate Director, Programs', t: 'EAII Advisors' },
    { n: 'Manohara Pittu', r: 'Senior Manager, State Program Management Unit', t: 'EAII Advisors' },
    { n: 'Priyamvada Chavhan', r: 'Senior Manager, Safe Water Operations', t: 'EAII Advisors' },
    { n: 'Himanshu Arora', r: 'Senior Manager, India Safe Water and MLE', t: 'EAII Advisors' },
    { n: 'Adhiraj Shekhawat', r: 'Senior Manager, MLE', t: 'EAII Advisors' },
    { n: 'Narendra Jangra', r: 'State Lead, IFA', t: 'EAII Advisors' },
    { n: 'Manoj Mavuduru', r: 'State Lead, India Safe Water', t: 'EAII Advisors' },
    { n: 'Ranjith Kasam', r: 'Senior State Program Coordinator', t: 'EAII Advisors' },
    { n: 'Azeezuddin Faizan', r: 'Senior State Program Coordinator', t: 'EAII Advisors' },
    { n: 'Vinay Gandhi', r: 'Regional Coordinator', t: 'EAII Advisors' },
    { n: 'Rajnish Saxena', r: 'Regional Coordinator', t: 'EAII Advisors' },
    { n: 'Robin George', r: 'State Program Officer, Madhya Pradesh', t: 'EAII Advisors' }
  ];
})(window.SIK = window.SIK || {});
