import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CalendarDays, ShoppingCart, BookOpen, Users, Plus, Trash2, LogOut } from 'lucide-react';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  setDoc,
  getDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db, provider, signInWithPopup, signOut, onAuthStateChanged } from './firebase';
import './styles.css';

const mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function makeHouseholdCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function App() {
  const [user, setUser] = useState(null);
  const [householdId, setHouseholdId] = useState(localStorage.getItem('householdId') || '');
  const [activeTab, setActiveTab] = useState('planner');
  const [meals, setMeals] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [grocery, setGrocery] = useState([]);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (!householdId) return;
    localStorage.setItem('householdId', householdId);

    const mealsQ = query(collection(db, 'meals'), where('householdId', '==', householdId));
    const recipesQ = query(collection(db, 'recipes'), where('householdId', '==', householdId));
    const groceryQ = query(collection(db, 'groceryItems'), where('householdId', '==', householdId));

    const unsubMeals = onSnapshot(mealsQ, snap => setMeals(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubRecipes = onSnapshot(recipesQ, snap => setRecipes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubGrocery = onSnapshot(groceryQ, snap => setGrocery(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => { unsubMeals(); unsubRecipes(); unsubGrocery(); };
  }, [householdId]);

  async function createHousehold() {
    const id = makeHouseholdCode();
    await setDoc(doc(db, 'households', id), {
      code: id,
      members: [user.uid],
      createdBy: user.uid,
      createdAt: new Date().toISOString(),
    });
    setHouseholdId(id);
  }

  async function joinHousehold(code) {
    const id = code.trim().toUpperCase();
    const householdRef = doc(db, 'households', id);
    const householdSnap = await getDoc(householdRef);
    if (!householdSnap.exists()) return alert('No household found with that code.');
    const members = householdSnap.data().members || [];
    await updateDoc(householdRef, { members: Array.from(new Set([...members, user.uid])) });
    setHouseholdId(id);
  }

  if (!user) return <Login />;
  if (!householdId) return <HouseholdSetup createHousehold={createHousehold} joinHousehold={joinHousehold} />;

  return (
    <div className="app">
      <header>
        <div>
          <h1>Meal Planner</h1>
          <p>Household code: <strong>{householdId}</strong></p>
        </div>
        <button className="ghost" onClick={() => signOut(auth)}><LogOut size={18}/> Log out</button>
      </header>

      <nav>
        <Tab id="planner" activeTab={activeTab} setActiveTab={setActiveTab} icon={<CalendarDays/>} label="Planner" />
        <Tab id="recipes" activeTab={activeTab} setActiveTab={setActiveTab} icon={<BookOpen/>} label="Recipes" />
        <Tab id="grocery" activeTab={activeTab} setActiveTab={setActiveTab} icon={<ShoppingCart/>} label="Grocery" />
        <Tab id="share" activeTab={activeTab} setActiveTab={setActiveTab} icon={<Users/>} label="Share" />
      </nav>

      {activeTab === 'planner' && <Planner householdId={householdId} meals={meals} recipes={recipes} />}
      {activeTab === 'recipes' && <Recipes householdId={householdId} recipes={recipes} />}
      {activeTab === 'grocery' && <Grocery householdId={householdId} grocery={grocery} meals={meals} />}
      {activeTab === 'share' && <Share householdId={householdId} setHouseholdId={setHouseholdId} />}
    </div>
  );
}

function Login() {
  return <div className="center-card"><h1>Meal Planner</h1><p>Plan meals and share the week with your spouse.</p><button onClick={() => signInWithPopup(auth, provider)}>Sign in with Google</button></div>;
}

function HouseholdSetup({ createHousehold, joinHousehold }) {
  const [code, setCode] = useState('');
  return <div className="center-card"><h1>Set up your household</h1><button onClick={createHousehold}>Create household</button><div className="divider">or</div><input placeholder="Enter spouse household code" value={code} onChange={e => setCode(e.target.value)} /><button className="secondary" onClick={() => joinHousehold(code)}>Join household</button></div>;
}

function Tab({ id, activeTab, setActiveTab, icon, label }) {
  return <button className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}>{React.cloneElement(icon, { size: 18 })}{label}</button>;
}

function Planner({ householdId, meals, recipes }) {
  const [form, setForm] = useState({ day: 'Monday', mealType: 'Dinner', name: '', ingredients: '', notes: '' });

  async function addMeal(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    await addDoc(collection(db, 'meals'), { ...form, householdId, createdAt: new Date().toISOString() });
    setForm({ ...form, name: '', ingredients: '', notes: '' });
  }

  async function removeMeal(id) { await deleteDoc(doc(db, 'meals', id)); }

  return <main><section className="panel"><h2>Add meal</h2><form onSubmit={addMeal} className="form-grid"><select value={form.day} onChange={e => setForm({ ...form, day: e.target.value })}>{days.map(d => <option key={d}>{d}</option>)}</select><select value={form.mealType} onChange={e => setForm({ ...form, mealType: e.target.value })}>{mealTypes.map(t => <option key={t}>{t}</option>)}</select><input placeholder="Meal name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /><input placeholder="Ingredients, comma separated" value={form.ingredients} onChange={e => setForm({ ...form, ingredients: e.target.value })} /><textarea placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /><button><Plus size={18}/> Add</button></form>{recipes.length > 0 && <p className="hint">Tip: copy recipe ingredients from your saved recipes into a meal.</p>}</section><section className="week-grid">{days.map(day => <div className="day-card" key={day}><h3>{day}</h3>{mealTypes.map(type => { const dayMeals = meals.filter(m => m.day === day && m.mealType === type); return <div key={type} className="meal-block"><h4>{type}</h4>{dayMeals.length === 0 ? <p className="empty">No meal yet</p> : dayMeals.map(m => <div className="meal" key={m.id}><div><strong>{m.name}</strong>{m.ingredients && <p>{m.ingredients}</p>}{m.notes && <small>{m.notes}</small>}</div><button className="icon" onClick={() => removeMeal(m.id)}><Trash2 size={16}/></button></div>)}</div>; })}</div>)}</section></main>;
}

function Recipes({ householdId, recipes }) {
  const [form, setForm] = useState({ name: '', ingredients: '', instructions: '' });
  async function addRecipe(e) { e.preventDefault(); if (!form.name.trim()) return; await addDoc(collection(db, 'recipes'), { ...form, householdId, createdAt: new Date().toISOString() }); setForm({ name: '', ingredients: '', instructions: '' }); }
  return <main><section className="panel"><h2>Saved recipes</h2><form onSubmit={addRecipe} className="form-grid"><input placeholder="Recipe name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/><textarea placeholder="Ingredients" value={form.ingredients} onChange={e => setForm({ ...form, ingredients: e.target.value })}/><textarea placeholder="Instructions" value={form.instructions} onChange={e => setForm({ ...form, instructions: e.target.value })}/><button><Plus size={18}/> Save recipe</button></form></section><section className="cards">{recipes.map(r => <article className="recipe" key={r.id}><h3>{r.name}</h3><p><strong>Ingredients:</strong> {r.ingredients}</p><p>{r.instructions}</p><button className="ghost danger" onClick={() => deleteDoc(doc(db, 'recipes', r.id))}>Delete</button></article>)}</section></main>;
}

function Grocery({ householdId, grocery, meals }) {
  const suggestedItems = useMemo(() => Array.from(new Set(meals.flatMap(m => (m.ingredients || '').split(',').map(i => i.trim()).filter(Boolean)))), [meals]);
  const [item, setItem] = useState('');
  async function addItem(name) { if (!name.trim()) return; await addDoc(collection(db, 'groceryItems'), { householdId, name: name.trim(), checked: false, createdAt: new Date().toISOString() }); setItem(''); }
  return <main><section className="panel"><h2>Grocery list</h2><div className="inline"><input placeholder="Add grocery item" value={item} onChange={e => setItem(e.target.value)} /><button onClick={() => addItem(item)}>Add</button></div><h3>Suggested from meals</h3><div className="chips">{suggestedItems.map(i => <button key={i} onClick={() => addItem(i)}>{i}</button>)}</div></section><section className="panel"><ul className="grocery-list">{grocery.map(g => <li key={g.id}><label><input type="checkbox" checked={g.checked} onChange={e => updateDoc(doc(db, 'groceryItems', g.id), { checked: e.target.checked })}/><span className={g.checked ? 'checked' : ''}>{g.name}</span></label><button className="icon" onClick={() => deleteDoc(doc(db, 'groceryItems', g.id))}><Trash2 size={16}/></button></li>)}</ul></section></main>;
}

function Share({ householdId, setHouseholdId }) {
  return <main><section className="panel"><h2>Share with your spouse</h2><p>Have your spouse sign in, choose “Join household,” and enter this code:</p><div className="share-code">{householdId}</div><button className="secondary" onClick={() => navigator.clipboard.writeText(householdId)}>Copy code</button><button className="ghost danger" onClick={() => { localStorage.removeItem('householdId'); setHouseholdId(''); }}>Leave household on this device</button></section></main>;
}

createRoot(document.getElementById('root')).render(<App />);
