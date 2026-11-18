-- Edit every value before running. Run once.
insert into services (title, slug, description, price, duration_minutes) values
('Complete Jathakam Analysis','jathakam-analysis','Detailed reading of your birth chart.',1500,60),
('Marriage Compatibility','marriage-compatibility','Kundali matching for two charts.',1000,45),
('Career and Business Consultation','career-consultation','Guidance on career and business timing.',1000,45),
('Dosha Analysis','dosha-analysis','Review of doshas and suggested remedies.',800,30),
('General Consultation','general-consultation','Answers to your specific questions.',500,30);

-- weekday 0 = Sunday. Two sessions per day; the gap is the break.
insert into availability (weekday, start_time, end_time, slot_duration)
select d, t.s::time, t.e::time, 30 from generate_series(1,6) d,
(values ('10:00','13:00'),('16:00','19:00')) as t(s,e);

update settings set astrologer_name='Your Name', whatsapp_number='919876543210',
  contact_number='+91 98765 43210', email='you@example.com', years_experience=10 where id=1;
