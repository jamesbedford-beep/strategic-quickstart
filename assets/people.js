/* Optional roster for the team-name autocomplete. Typing "Gra" suggests
   "Grace Hultquist" and fills in her initials and team.

   Deliberately names and teams only. Job titles are not listed: they go stale
   quickly, and this file sits in a public repository. Where someone works is
   enough to tell two similar names apart in a picker, which is all this is for.

   This file is entirely optional: delete it, empty the array, or drop the
   <script> tag and the tool works exactly as before, just without suggestions.
   Nothing here is sent anywhere; it is read in the browser only.

   To adapt it for your own team, replace the entries. Format:
     n  full name
     t  team, program, function, or country

   Correct anything wrong before an export goes to anyone. This is a convenience
   for filling in a form, not a source of truth about who does what. */
(function (SIK) {
  'use strict';

  SIK.people = [
    /* --- Programs --- */
    { n: 'Kate McCracken', t: 'Deworm the World' },
    { n: 'Anam Abdulla', t: 'Deworm the World' },
    { n: 'Diana Munanka', t: 'Deworm the World' },
    { n: 'Rebekah Chang', t: 'Nutrition' },
    { n: 'Grace Hultquist', t: 'Nutrition' },
    { n: 'Savannah Newman', t: 'Nutrition' },
    { n: 'Eliza Walwyn-Jones', t: 'Nutrition' },
    { n: 'Katie Callahan', t: 'Safe Water Now' },
    { n: 'Moses Baraza', t: 'Safe Water Now' },
    { n: 'Samson Wakoli', t: 'Safe Water Now' },
    { n: 'Moses Chisangwala', t: 'Safe Water Now' },
    { n: 'Evelyn Anek', t: 'Safe Water Now' },
    { n: 'Riley Edwards', t: 'Safe Water Now' },
    { n: 'Anna Walker', t: 'Safe Water Now' },
    { n: 'Gabriel Ngoga', t: 'Safe Water Now' },
    { n: 'Anna Konstantinova', t: 'Syphilis-Free Start' },
    { n: 'Kristopher Mills', t: 'Syphilis-Free Start' },
    { n: 'Mark Minnery', t: 'Global Programs' },

    /* --- Cross-cutting functions --- */
    { n: 'Natalie Duarte', t: 'MLE' },
    { n: 'Illah Evance', t: 'MLE' },
    { n: 'Ify Chime', t: 'MLE' },
    { n: 'Faridah Mungoni', t: 'MLE' },
    { n: 'Ferdnand Ongeta', t: 'MLE' },
    { n: 'Hilda Nanzala', t: 'MLE' },
    { n: 'Gentrix Obinda', t: 'MLE' },
    { n: 'Emmanuel Mngoli', t: 'MLE' },
    { n: 'Andrew Wang', t: 'Cost-Effectiveness' },
    { n: 'Kyle Holloway', t: 'Accelerator / NPD' },
    { n: 'Colin Richardson', t: 'Accelerator / NPD' },
    { n: 'Sitara Kumbale', t: 'Accelerator / NPD' },
    { n: 'Sarah Thompson', t: 'Strategic Initiatives' },
    { n: 'Katie Donley', t: 'Strategic Initiatives' },
    { n: 'Karen Olege', t: 'People and Culture' },
    { n: 'Kali Bell', t: 'People and Culture' },
    { n: 'Rajab Hamisi', t: 'Management' },
    { n: 'Chris Dunn', t: 'Management' },
    { n: 'Kanika Bahl', t: 'Leadership' },
    { n: 'Danielle Bayer', t: 'Leadership' },

    /* --- Country and regional --- */
    { n: 'Chrispin Owaga', t: 'Kenya and Malawi' },
    { n: 'Linda Matita', t: 'Malawi' },
    { n: 'Namakau Nyambe', t: 'Zambia' },
    { n: 'Tope Ogunbi', t: 'Nigeria' },
    { n: 'Toochi Ohaji', t: 'Nigeria' },
    { n: 'Maryann Edeh', t: 'Nigeria' },
    { n: 'Emilie Efronson', t: 'Liberia' },
    { n: 'Marinnette Ngo Nemb', t: 'Cameroon' },
    { n: 'Richard Kibuuka', t: 'Uganda' },

    /* --- EAII Advisors, India technical partner --- */
    { n: 'Priyanka Roy', t: 'EAII Advisors' },
    { n: 'Bimlesh Kumar', t: 'EAII Advisors' },
    { n: 'Ajay Singh', t: 'EAII Advisors' },
    { n: 'Ankur Sooden', t: 'EAII Advisors' },
    { n: 'Nitin Sharma', t: 'EAII Advisors' },
    { n: 'Tejesh Chawda', t: 'EAII Advisors' },
    { n: 'Pratyush Bishi', t: 'EAII Advisors' },
    { n: 'Abhinav Anand', t: 'EAII Advisors' },
    { n: 'Anurag Taneja', t: 'EAII Advisors' },
    { n: 'Manohara Pittu', t: 'EAII Advisors' },
    { n: 'Priyamvada Chavhan', t: 'EAII Advisors' },
    { n: 'Himanshu Arora', t: 'EAII Advisors' },
    { n: 'Adhiraj Shekhawat', t: 'EAII Advisors' },
    { n: 'Narendra Jangra', t: 'EAII Advisors' },
    { n: 'Manoj Mavuduru', t: 'EAII Advisors' },
    { n: 'Ranjith Kasam', t: 'EAII Advisors' },
    { n: 'Azeezuddin Faizan', t: 'EAII Advisors' },
    { n: 'Vinay Gandhi', t: 'EAII Advisors' },
    { n: 'Rajnish Saxena', t: 'EAII Advisors' },
    { n: 'Robin George', t: 'EAII Advisors' }
  ];
})(window.SIK = window.SIK || {});
